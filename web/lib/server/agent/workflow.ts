import { getEnv } from "../env";
import type { RequestContext } from "../types";
import { applyTokenEconomy, getCachedResponse, setCachedResponse } from "./tokenEconomy";
import { callOpenAiResponses } from "../openai";

export type WorkflowNodeType = "chat" | "http" | "sleep" | "set" | "loop";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  timeoutMs?: number;
  input?: Record<string, unknown>;
  /** Child nodes executed once per iteration. Only used by `loop` nodes. */
  body?: WorkflowNode[];
}

/** Hard cap on how deeply loops may nest, independent of any per-node setting. */
const MAX_LOOP_DEPTH = 3;

export interface WorkflowSpec {
  id?: string;
  name?: string;
  timeoutMs?: number;
  nodes: WorkflowNode[];
}

export interface WorkflowNodeLog {
  nodeId: string;
  type: WorkflowNodeType;
  status: "success" | "failure" | "timeout";
  startedAt: number;
  finishedAt: number;
  reason?: string;
  output?: unknown;
}

export interface WorkflowRunResult {
  requestId: string;
  status: "success" | "failure" | "timeout";
  logs: WorkflowNodeLog[];
  outputs: Record<string, unknown>;
}

type AnyRecord = Record<string, unknown>;

function assertString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Invalid ${name}`);
  return value;
}

function allowedHosts(): Set<string> {
  const env = getEnv();
  const raw = env.DISHA_WORKFLOW_ALLOWED_HOSTS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function sleep(ms: number, timeoutMs: number): Promise<void> {
  const bounded = Math.max(0, Math.min(ms, 5_000));
  const timeout = Math.max(1, timeoutMs);
  await Promise.race([
    new Promise<void>((r) => setTimeout(r, bounded)),
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeout)),
  ]);
}

async function chatNode(ctx: RequestContext, input: AnyRecord, timeoutMs: number): Promise<unknown> {
  const env = getEnv();
  const body = { ...input, stream: false };
  const { body: optimizedBody, decision } = applyTokenEconomy(body);

  const cacheHit = await getCachedResponse(decision.cacheKey);
  if (cacheHit) return { cached: true, contentType: cacheHit.contentType, body: cacheHit.bodyText };

  const response = env.OPENAI_API_KEY
    ? await callOpenAiResponses(optimizedBody, { timeoutMs, requestId: ctx.requestId })
    : await fetch(`${env.DISHA_BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          ...optimizedBody,
          metadata: {
            ...(typeof optimizedBody.metadata === "object" && optimizedBody.metadata !== null ? optimizedBody.metadata : {}),
            requestId: ctx.requestId,
            userId: ctx.principal.userId,
          },
        }),
      });

  const contentType = response.headers.get("Content-Type") ?? "application/json";
  const text = await response.text();
  if (!response.ok) throw Object.assign(new Error("chat backend failed"), { status: response.status });
  await setCachedResponse(decision.cacheKey, { contentType, bodyText: text, createdAt: Date.now() });
  return { cached: false, contentType, body: text };
}

async function httpNode(input: AnyRecord, timeoutMs: number): Promise<unknown> {
  const env = getEnv();
  const allow = allowedHosts();
  const url = new URL(assertString(input.url, "url"));
  if (!allow.has(url.host.toLowerCase())) {
    throw Object.assign(new Error("Workflow HTTP host not allowlisted"), { status: 403 });
  }
  const method = (typeof input.method === "string" ? input.method : "GET").toUpperCase();
  const headers = typeof input.headers === "object" && input.headers !== null ? (input.headers as Record<string, string>) : {};
  const body = input.body === undefined ? undefined : JSON.stringify(input.body);

  const response = await fetch(url.toString(), {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body && method !== "GET" ? body : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const contentType = response.headers.get("Content-Type") ?? "text/plain";
  const text = await response.text();
  return { status: response.status, contentType, body: text };
}

type ExecStatus = "success" | "failure" | "timeout";

interface ExecBase {
  ctx: RequestContext;
  env: ReturnType<typeof getEnv>;
  startedAt: number;
  totalTimeoutMs: number;
}

/** Signals a timeout distinctly from a generic failure so callers can classify it. */
class TimeoutError extends Error {
  constructor() {
    super("timeout");
  }
}

async function runLoop(base: ExecBase, node: WorkflowNode, depth: number): Promise<unknown> {
  if (depth >= MAX_LOOP_DEPTH) throw new Error("loop nesting exceeds maximum depth");
  const body = node.body ?? [];
  const input = node.input ?? {};

  const forEach = Array.isArray(input.forEach) ? input.forEach : null;
  const requested = forEach ? forEach.length : Math.max(0, Math.floor(Number(input.times ?? 1)));
  const nodeCap = Number.isFinite(Number(input.maxIterations)) ? Math.max(0, Math.floor(Number(input.maxIterations))) : Number.POSITIVE_INFINITY;
  const hardCap = base.env.DISHA_WORKFLOW_MAX_LOOP_ITERATIONS;
  const cap = Math.min(requested, nodeCap, hardCap);

  const results: AnyRecord[] = [];
  for (let index = 0; index < cap; index += 1) {
    if (Date.now() - base.startedAt > base.totalTimeoutMs) throw new TimeoutError();

    const scope: AnyRecord = {};
    const iterationLogs: WorkflowNodeLog[] = [];
    const status = await executeNodes(base, body, scope, iterationLogs, depth + 1);

    const record: AnyRecord = { index, outputs: scope, logs: iterationLogs };
    if (forEach) record.item = forEach[index];
    results.push(record);

    if (status !== "success") {
      const err = status === "timeout" ? new TimeoutError() : new Error(`loop body failed at iteration ${index}`);
      Object.assign(err, { partialResults: results });
      throw err;
    }
  }

  return { iterations: results.length, requested, capped: requested > cap, results };
}

async function executeNodes(
  base: ExecBase,
  nodes: WorkflowNode[],
  outputs: AnyRecord,
  logs: WorkflowNodeLog[],
  depth: number,
): Promise<ExecStatus> {
  for (const node of nodes) {
    if (Date.now() - base.startedAt > base.totalTimeoutMs) return "timeout";

    const nodeTimeout = node.timeoutMs ?? base.env.DISHA_WORKFLOW_NODE_TIMEOUT_MS;
    const log: WorkflowNodeLog = {
      nodeId: node.id,
      type: node.type,
      status: "success",
      startedAt: Date.now(),
      finishedAt: Date.now(),
    };

    try {
      let out: unknown;
      if (node.type === "set") {
        out = node.input ?? {};
      } else if (node.type === "sleep") {
        const ms = Number(node.input?.ms ?? 250);
        await sleep(ms, nodeTimeout);
        out = { sleptMs: Math.max(0, Math.min(ms, 5_000)) };
      } else if (node.type === "http") {
        out = await httpNode(node.input ?? {}, nodeTimeout);
      } else if (node.type === "chat") {
        out = await chatNode(base.ctx, node.input ?? {}, nodeTimeout);
      } else if (node.type === "loop") {
        out = await runLoop(base, node, depth);
      } else {
        throw new Error("Unknown workflow node type");
      }

      outputs[node.id] = out;
      log.output = out;
      log.finishedAt = Date.now();
      logs.push(log);
    } catch (error) {
      const timedOut = error instanceof TimeoutError || (error instanceof Error && error.message === "timeout");
      log.status = timedOut ? "timeout" : "failure";
      log.reason = error instanceof Error ? error.message : "unknown_error";
      log.finishedAt = Date.now();
      logs.push(log);
      return timedOut ? "timeout" : "failure";
    }
  }

  return "success";
}

export async function runWorkflow(ctx: RequestContext, spec: WorkflowSpec): Promise<WorkflowRunResult> {
  const env = getEnv();
  const base: ExecBase = {
    ctx,
    env,
    startedAt: Date.now(),
    totalTimeoutMs: spec.timeoutMs ?? env.DISHA_WORKFLOW_TOTAL_TIMEOUT_MS,
  };
  const outputs: Record<string, unknown> = {};
  const logs: WorkflowNodeLog[] = [];

  const status = await executeNodes(base, spec.nodes, outputs, logs, 0);
  return { requestId: ctx.requestId, status, logs, outputs };
}
