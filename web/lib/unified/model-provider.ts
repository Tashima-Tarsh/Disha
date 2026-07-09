import type { MissionResult } from "./orchestrator";
import { getEnv } from "../server/env";

export type ModelProviderName = "disabled" | "anthropic" | "openai";

export type ModelIntelligenceRequest = {
  mission: MissionResult;
  operatorInstruction?: string;
};

export type ModelIntelligenceResult = {
  provider: ModelProviderName;
  model: string;
  status: "completed" | "disabled" | "policy_blocked" | "provider_error";
  summary: string;
  reasoningNotes: string[];
  recommendedNextSteps: string[];
  evidenceEventIds: string[];
  verifyRequired: string[];
  policyBoundary: string;
  rawProviderText?: string;
  error?: string;
};

type ProviderPayload = {
  provider: Exclude<ModelProviderName, "disabled">;
  model: string;
  system: string;
  user: string;
};

const unsafeRecommendationPattern = /hack|exploit|ddos|malware|credential|brute force|bypass authentication|surveillance abuse|targeting/i;

export async function runModelIntelligence(input: ModelIntelligenceRequest): Promise<ModelIntelligenceResult> {
  const env = getEnv();
  const mission = input.mission;
  const provider = selectProvider(env.DISHA_MODEL_PROVIDER, Boolean(env.ANTHROPIC_API_KEY), Boolean(env.OPENAI_API_KEY));
  const fallback = deterministicIntelligence(mission, provider);

  if (mission.policyDecision.decision === "DENY") {
    return {
      ...fallback,
      status: "policy_blocked",
      summary: "Model execution was not run because the policy gate denied the requested action.",
      recommendedNextSteps: [
        mission.policyDecision.safeFallback,
        "Reframe the mission as lawful, defensive, evidence-preserving analysis before re-running.",
      ],
    };
  }

  if (provider === "disabled") {
    return fallback;
  }

  const payload = buildProviderPayload(provider, mission, input.operatorInstruction);
  try {
    const rawProviderText = provider === "anthropic"
      ? await callAnthropic(payload, env.DISHA_MODEL_TIMEOUT_MS)
      : await callOpenAi(payload, env.DISHA_MODEL_TIMEOUT_MS);
    return coerceProviderResult(rawProviderText, fallback, payload);
  } catch (error) {
    return {
      ...fallback,
      status: "provider_error",
      error: error instanceof Error ? error.message : "Unknown provider error",
    };
  }
}

function selectProvider(configured: ModelProviderName, hasAnthropicKey: boolean, hasOpenAiKey: boolean): ModelProviderName {
  if (configured === "anthropic" && hasAnthropicKey) return "anthropic";
  if (configured === "openai" && hasOpenAiKey) return "openai";
  if (configured === "disabled") return "disabled";
  return "disabled";
}

function deterministicIntelligence(mission: MissionResult, provider: ModelProviderName): ModelIntelligenceResult {
  const topFindings = mission.fusedIntelligence.topFindings.length
    ? mission.fusedIntelligence.topFindings
    : ["No high-confidence finding was produced by the current lens set."];
  return {
    provider,
    model: provider === "disabled" ? "none" : configuredModel(provider),
    status: "disabled",
    summary: mission.fusedIntelligence.executiveSummary || "Mission completed with no model provider configured.",
    reasoningNotes: [
      `Policy decision: ${mission.policyDecision.decision}.`,
      `Risk score: ${mission.riskScore.toFixed(2)}.`,
      `Lens confidence: ${mission.fusedIntelligence.confidence.toFixed(2)}.`,
      ...topFindings.slice(0, 3),
    ],
    recommendedNextSteps: mission.fusedIntelligence.recommendedSafeActions.length
      ? mission.fusedIntelligence.recommendedSafeActions
      : [mission.policyDecision.safeFallback],
    evidenceEventIds: mission.evidenceEventIds,
    verifyRequired: mission.fusedIntelligence.verifyRequiredItems,
    policyBoundary: "Model output is advisory only. Policy gate, evidence ledger, and human approval remain authoritative.",
  };
}

function configuredModel(provider: Exclude<ModelProviderName, "disabled">): string {
  const env = getEnv();
  return provider === "anthropic" ? env.ANTHROPIC_MODEL : env.OPENAI_MODEL;
}

function buildProviderPayload(
  provider: Exclude<ModelProviderName, "disabled">,
  mission: MissionResult,
  operatorInstruction?: string,
): ProviderPayload {
  const system = [
    "You are the DISHA governed model intelligence adapter.",
    "Return compact JSON only with keys: summary, reasoningNotes, recommendedNextSteps, verifyRequired.",
    "Do not invent facts, dates, legal references, incidents, sources, or capabilities.",
    "If a claim is not supported by the supplied mission evidence, include it under verifyRequired.",
    "Do not propose offensive cyber, surveillance abuse, targeting, or policy bypass.",
    "Policy gate and evidence ledger are authoritative; your output is advisory.",
  ].join(" ");

  const missionFrame = {
    missionId: mission.missionId,
    selectedLenses: mission.selectedLenses,
    policyDecision: mission.policyDecision,
    safeExecution: mission.safeExecution,
    riskScore: mission.riskScore,
    fusedIntelligence: mission.fusedIntelligence,
    evidenceEventIds: mission.evidenceEventIds,
    lensSummaries: mission.lensResults.map((result) => ({
      lens: result.lens,
      summary: result.summary,
      confidence: result.confidence,
      riskScore: result.riskScore,
      findingTitles: result.findings.map((finding) => finding.title),
      evidenceIds: result.evidence.map((item) => item.id),
    })),
    operatorInstruction: operatorInstruction ?? "Prepare the next safe intelligence brief.",
  };

  return { provider, model: configuredModel(provider), system, user: JSON.stringify(missionFrame) };
}

async function callAnthropic(payload: ProviderPayload, timeoutMs: number): Promise<string> {
  const env = getEnv();
  const response = await fetch(`${env.ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": env.ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: payload.model,
      max_tokens: 1200,
      system: payload.system,
      messages: [{ role: "user", content: payload.user }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return readProviderResponse(response, "anthropic");
}

async function callOpenAi(payload: ProviderPayload, timeoutMs: number): Promise<string> {
  const env = getEnv();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.OPENAI_API_KEY ?? ""}`,
  };
  if (env.OPENAI_PROJECT) headers["OpenAI-Project"] = env.OPENAI_PROJECT;
  if (env.OPENAI_ORGANIZATION) headers["OpenAI-Organization"] = env.OPENAI_ORGANIZATION;
  const response = await fetch(`${env.OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: payload.model,
      instructions: payload.system,
      input: payload.user,
      store: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return readProviderResponse(response, "openai");
}

async function readProviderResponse(response: Response, provider: Exclude<ModelProviderName, "disabled">): Promise<string> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body === "object" && body && "error" in body
      ? JSON.stringify((body as { error: unknown }).error)
      : response.statusText;
    throw new Error(`${provider} provider failed: ${message}`);
  }
  if (provider === "anthropic") {
    const content = (body as { content?: Array<{ type?: string; text?: string }> }).content ?? [];
    return content.filter((item) => item.type === "text" && item.text).map((item) => item.text).join("\n");
  }
  const outputText = (body as { output_text?: unknown }).output_text;
  if (typeof outputText === "string") return outputText;
  return JSON.stringify(body);
}

function coerceProviderResult(
  rawProviderText: string,
  fallback: ModelIntelligenceResult,
  payload: ProviderPayload,
): ModelIntelligenceResult {
  const parsed = parseJsonObject(rawProviderText);
  if (!parsed) {
    return {
      ...fallback,
      status: "completed",
      provider: payload.provider,
      model: payload.model,
      rawProviderText,
    };
  }
  return {
    ...fallback,
    status: "completed",
    provider: payload.provider,
    model: payload.model,
    summary: stringValue(parsed.summary, fallback.summary),
    reasoningNotes: stringArray(parsed.reasoningNotes, fallback.reasoningNotes),
    recommendedNextSteps: governedRecommendations(stringArray(parsed.recommendedNextSteps, fallback.recommendedNextSteps), fallback),
    verifyRequired: governedVerifyRequired(
      stringArray(parsed.verifyRequired, fallback.verifyRequired),
      stringArray(parsed.recommendedNextSteps, fallback.recommendedNextSteps),
      fallback,
    ),
    rawProviderText,
  };
}

function governedRecommendations(recommendations: string[], fallback: ModelIntelligenceResult): string[] {
  const safe = recommendations.filter((item) => !unsafeRecommendationPattern.test(item));
  if (safe.length > 0) return safe.slice(0, 12);
  return fallback.recommendedNextSteps.length
    ? fallback.recommendedNextSteps
    : ["Do not execute external action; preserve evidence and request human review."];
}

function governedVerifyRequired(
  verifyRequired: string[],
  recommendations: string[],
  fallback: ModelIntelligenceResult,
): string[] {
  const entries = new Set([...fallback.verifyRequired, ...verifyRequired]);
  if ([...verifyRequired, ...recommendations].some((item) => unsafeRecommendationPattern.test(item))) {
    entries.add("Provider output contained unsafe action language and was policy-filtered.");
  }
  return Array.from(entries).slice(0, 20);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const candidate = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  return normalized.length ? normalized.slice(0, 12) : fallback;
}
