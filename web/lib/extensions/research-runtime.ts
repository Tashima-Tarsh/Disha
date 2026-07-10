import { z } from "zod";

import { getEnv } from "../server/env";
import { hashValue } from "../unified/hash";
import type { MissionResult } from "../unified/orchestrator";

export const governedResearchComponentSchema = z.enum(["disha-brain", "cognitive-engine", "memory-graph"]);

export const governedResearchRuntimeRequestSchema = z.object({
  contractVersion: z.literal("disha.research-runtime.v1"),
  requestId: z.string().min(1),
  missionId: z.string().min(1),
  component: governedResearchComponentSchema,
  mode: z.literal("read_only"),
  rawText: z.string().max(20_000),
  context: z.object({
    selectedLenses: z.array(z.string()).max(20),
    evidenceEventIds: z.array(z.string()).max(200),
    sensitivity: z.enum(["public", "internal", "controlled", "classified"]),
  }),
  constraints: z.object({
    noExternalActions: z.literal(true),
    noStateMutation: z.literal(true),
    requireSourceHashes: z.literal(true),
    maxRuntimeMs: z.number().int().min(100).max(5_000),
  }),
});

export const governedResearchRuntimeResponseSchema = z.object({
  contractVersion: z.literal("disha.research-runtime.v1"),
  component: governedResearchComponentSchema,
  status: z.enum(["ok", "unavailable", "error"]),
  summary: z.string().max(4_000),
  observations: z.array(z.object({
    title: z.string().min(1).max(240),
    description: z.string().min(1).max(2_000),
    confidence: z.number().min(0).max(1),
    sourceHashes: z.array(z.string().min(8).max(128)).max(20).default([]),
  })).max(12).default([]),
  sourceHashes: z.array(z.string().min(8).max(128)).max(50).default([]),
  limitations: z.array(z.string().min(1).max(500)).max(20).default([]),
});

export const governedResearchRuntimeHealthSchema = z.object({
  contractVersion: z.literal("disha.research-runtime.v1"),
  status: z.enum(["ok", "unavailable", "error"]),
  components: z.array(governedResearchComponentSchema).default([]),
  message: z.string().max(1_000).optional(),
});

export type GovernedResearchComponent = z.infer<typeof governedResearchComponentSchema>;
export type GovernedResearchRuntimeRequest = z.infer<typeof governedResearchRuntimeRequestSchema>;
export type GovernedResearchRuntimeResponse = z.infer<typeof governedResearchRuntimeResponseSchema>;
export type GovernedResearchRuntimeHealth = z.infer<typeof governedResearchRuntimeHealthSchema> & {
  configured: boolean;
  endpoint?: string;
};

export function buildResearchRuntimeRequest(mission: MissionResult, component: GovernedResearchComponent): GovernedResearchRuntimeRequest {
  const env = getEnv();
  const maxRuntimeMs = Math.min(env.DISHA_RESEARCH_RUNTIME_TIMEOUT_MS, 5_000);
  return governedResearchRuntimeRequestSchema.parse({
    contractVersion: "disha.research-runtime.v1",
    requestId: hashValue({ missionId: mission.missionId, component, evidenceEventIds: mission.evidenceEventIds }).slice(0, 24),
    missionId: mission.missionId,
    component,
    mode: "read_only",
    rawText: mission.signal.input.rawText,
    context: {
      selectedLenses: mission.selectedLenses,
      evidenceEventIds: mission.evidenceEventIds,
      sensitivity: mission.signal.context.sensitivity,
    },
    constraints: {
      noExternalActions: true,
      noStateMutation: true,
      requireSourceHashes: true,
      maxRuntimeMs,
    },
  });
}

export async function queryGovernedResearchRuntime(
  mission: MissionResult,
  component: GovernedResearchComponent,
): Promise<GovernedResearchRuntimeResponse> {
  const env = getEnv();
  const request = buildResearchRuntimeRequest(mission, component);

  if (!env.DISHA_RESEARCH_RUNTIME_URL) {
    return unavailable(component, "No governed research runtime URL is configured.");
  }

  try {
    const endpoint = new URL("/governed/analyze", env.DISHA_RESEARCH_RUNTIME_URL);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.constraints.maxRuntimeMs);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.DISHA_RESEARCH_RUNTIME_TOKEN ? { Authorization: `Bearer ${env.DISHA_RESEARCH_RUNTIME_TOKEN}` } : {}),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        return unavailable(component, `Research runtime returned HTTP ${response.status}.`);
      }

      return governedResearchRuntimeResponseSchema.parse(await response.json());
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return unavailable(component, error instanceof Error ? error.message : "Research runtime request failed.");
  }
}

export async function checkGovernedResearchRuntimeHealth(): Promise<GovernedResearchRuntimeHealth> {
  const env = getEnv();

  if (!env.DISHA_RESEARCH_RUNTIME_URL) {
    return {
      contractVersion: "disha.research-runtime.v1",
      configured: false,
      status: "unavailable",
      components: [],
      message: "No governed research runtime URL is configured.",
    };
  }

  try {
    const endpoint = new URL("/governed/health", env.DISHA_RESEARCH_RUNTIME_URL);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(env.DISHA_RESEARCH_RUNTIME_TIMEOUT_MS, 5_000));
    try {
      const response = await fetch(endpoint, {
        headers: env.DISHA_RESEARCH_RUNTIME_TOKEN ? { Authorization: `Bearer ${env.DISHA_RESEARCH_RUNTIME_TOKEN}` } : {},
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          contractVersion: "disha.research-runtime.v1",
          configured: true,
          endpoint: redactEndpoint(endpoint),
          status: "error",
          components: [],
          message: `Research runtime health returned HTTP ${response.status}.`,
        };
      }

      const health = governedResearchRuntimeHealthSchema.parse(await response.json());
      return { ...health, configured: true, endpoint: redactEndpoint(endpoint) };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return {
      contractVersion: "disha.research-runtime.v1",
      configured: true,
      endpoint: redactEndpoint(new URL("/governed/health", env.DISHA_RESEARCH_RUNTIME_URL)),
      status: "error",
      components: [],
      message: error instanceof Error ? error.message : "Research runtime health check failed.",
    };
  }
}

function unavailable(component: GovernedResearchComponent, reason: string): GovernedResearchRuntimeResponse {
  return {
    contractVersion: "disha.research-runtime.v1",
    component,
    status: "unavailable",
    summary: "Governed research runtime is unavailable; DISHA used repository-bound adapter evidence only.",
    observations: [],
    sourceHashes: [],
    limitations: [reason],
  };
}

function redactEndpoint(endpoint: URL): string {
  return `${endpoint.protocol}//${endpoint.host}${endpoint.pathname}`;
}
