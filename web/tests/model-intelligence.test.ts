import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetEnvForTests } from "../lib/server/env";
import { runAgenticMission } from "../lib/unified/agentic-executor";
import { clearEvidenceLedgerForTests, getEvidenceEvents, verifyEvidenceChain } from "../lib/unified/evidence-ledger";
import { clearLearningMemoryForTests, getLearningMemory, learnFromMission } from "../lib/unified/learning-memory";
import { runModelIntelligence } from "../lib/unified/model-provider";
import { clearMissionsForTests, runMission } from "../lib/unified/orchestrator";

describe("DISHA governed model intelligence layer", () => {
  beforeEach(async () => {
    await clearEvidenceLedgerForTests();
    clearLearningMemoryForTests();
    await clearMissionsForTests();
    resetEnvForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetEnvForTests();
  });

  it("returns deterministic advisory intelligence when no provider is enabled", async () => {
    const mission = await runMission({
      rawText: "Assess public cyber telemetry and prepare an evidence brief",
      userId: "u1",
      userRole: "analyst",
      indicators: [{ type: "domain", value: "example.gov" }],
    });
    const result = await runModelIntelligence({ mission });
    expect(result.provider).toBe("disabled");
    expect(result.status).toBe("disabled");
    expect(result.evidenceEventIds).toEqual(mission.evidenceEventIds);
    expect(result.policyBoundary).toContain("Policy gate");
  });

  it("does not call model intelligence for denied missions", async () => {
    const mission = await runMission({
      rawText: "Cyber response",
      requestedAction: "exploit attacker system",
      userId: "u1",
      userRole: "operator",
      indicators: [{ type: "ip", value: "203.0.113.10" }],
    });
    const result = await runModelIntelligence({ mission });
    expect(mission.policyDecision.decision).toBe("DENY");
    expect(result.status).toBe("policy_blocked");
    expect(result.summary).toContain("policy gate denied");
  });

  it("filters unsafe provider recommendations before returning model intelligence", async () => {
    vi.stubEnv("DISHA_MODEL_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    resetEnvForTests();
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        output_text: JSON.stringify({
          summary: "Review completed.",
          reasoningNotes: ["Uses only supplied mission frame."],
          recommendedNextSteps: ["exploit the suspected attacker", "preserve evidence and request review"],
          verifyRequired: [],
        }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    ));

    const mission = await runMission({
      rawText: "Assess public cyber telemetry and prepare an evidence brief",
      userId: "u1",
      userRole: "analyst",
      indicators: [{ type: "domain", value: "example.gov" }],
    });
    const result = await runModelIntelligence({ mission });
    expect(result.status).toBe("completed");
    expect(result.provider).toBe("openai");
    expect(result.recommendedNextSteps).not.toContain("exploit the suspected attacker");
    expect(result.recommendedNextSteps).toContain("preserve evidence and request review");
    expect(result.verifyRequired).toContain("Provider output contained unsafe action language and was policy-filtered.");
  });

  it("runs a complete agentic mission through evidence, model output, and learning memory", async () => {
    const result = await runAgenticMission({
      rawText: "Assess flood infrastructure risk and prepare a public evidence brief",
      userId: "u1",
      userRole: "analyst",
      locations: [{ latitude: 26.1, longitude: 91.7, label: "Assam point" }],
      operatorInstruction: "Return the safest next brief structure.",
    });
    expect(result.mission.policyDecision.decision).not.toBe("DENY");
    expect(result.modelIntelligence.evidenceEventIds).toEqual(result.evidenceEventIds);
    expect(result.learning?.sourceEventIds).toEqual(result.evidenceEventIds.slice(0, -1));
    expect(getLearningMemory(result.mission.missionId)).toHaveLength(1);
    expect(verifyEvidenceChain(await getEvidenceEvents(result.mission.missionId)).ok).toBe(true);
  });

  it("redacts controlled mission learning memory", async () => {
    const mission = await runMission({
      rawText: "Controlled district incident note with email person@example.gov",
      sensitivity: "controlled",
      userId: "u1",
      userRole: "analyst",
    });
    const model = await runModelIntelligence({ mission });
    const memory = learnFromMission(mission, model);
    expect(memory?.redacted).toBe(true);
    expect(memory?.summary).toContain("Redacted controlled mission memory");
    expect(memory?.summary).not.toContain("person@example.gov");
  });

  it("does not learn from denied missions", async () => {
    const mission = await runMission({
      rawText: "Cyber response",
      requestedAction: "hack back",
      userId: "u1",
      userRole: "operator",
    });
    const model = await runModelIntelligence({ mission });
    expect(learnFromMission(mission, model)).toBeNull();
    expect(getLearningMemory()).toHaveLength(0);
  });
});
