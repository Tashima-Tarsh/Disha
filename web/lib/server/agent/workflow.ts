import { getEnv } from "../env";
import type { RequestContext } from "../types";
import { applyTokenEconomy, getCachedResponse, setCachedResponse } from "./tokenEconomy";

export type WorkflowNodeType = "chat" | "http" | "sleep" | "set";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  timeoutMs?: number;
  input?: Record<string, unknown>;
}

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

  const response = await fetch(`${env.DISHA_BACKEND_URL}/api/chat`, {
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

export async function runWorkflow(ctx: RequestContext, spec: WorkflowSpec): Promise<WorkflowRunResult> {
  const env = getEnv();
  const startedAt = Date.now();
  const totalTimeoutMs = spec.timeoutMs ?? env.DISHA_WORKFLOW_TOTAL_TIMEOUT_MS;
  const outputs: Record<string, unknown> = {};
  const logs: WorkflowNodeLog[] = [];

  for (const node of spec.nodes) {
    const now = Date.now();
    if (now - startedAt > totalTimeoutMs) {
      return { requestId: ctx.requestId, status: "timeout", logs, outputs };
    }

    const nodeTimeout = node.timeoutMs ?? env.DISHA_WORKFLOW_NODE_TIMEOUT_MS;
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
        out = await chatNode(ctx, node.input ?? {}, nodeTimeout);
      } else {
        throw new Error("Unknown workflow node type");
      }

      outputs[node.id] = out;
      log.output = out;
      log.finishedAt = Date.now();
      logs.push(log);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      log.status = message === "timeout" ? "timeout" : "failure";
      log.reason = message;
      log.finishedAt = Date.now();
      logs.push(log);
      return { requestId: ctx.requestId, status: log.status === "timeout" ? "timeout" : "failure", logs, outputs };
    }
  }

  return { requestId: ctx.requestId, status: "success", logs, outputs };
}
