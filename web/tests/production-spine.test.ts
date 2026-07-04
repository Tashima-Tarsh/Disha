import { describe, expect, it } from "vitest";

import { createClaimProvenance, assertDashboardClaim } from "../lib/unified/claim-provenance";
import { queryOpenData } from "../lib/unified/data-integration";
import { getProductionSpineReport, getSevenProductionCapabilities } from "../lib/unified/production-spine";
import { getParserPlan, listSourceParserPlans, summarizeIngestionReadiness } from "../lib/unified/source-ingestion";

describe("DISHA seven-part production spine", () => {
  it("defines all seven production capabilities", () => {
    const capabilities = getSevenProductionCapabilities();
    expect(capabilities.map((item) => item.id)).toEqual([
      "source-parsers",
      "persistent-evidence",
      "claim-provenance",
      "dashboard-safe-feed",
      "agent-policy-runtime",
      "security-boundaries",
      "deployment-readiness",
    ]);
    expect(capabilities.every((item) => item.openAiPath.length > 0)).toBe(true);
    expect(capabilities.every((item) => item.evidenceRule.length > 0)).toBe(true);
  });

  it("tracks priority official parser plans without synthetic rows", () => {
    const readiness = summarizeIngestionReadiness();
    expect(readiness.noSyntheticRows).toBe(true);
    expect(readiness.prioritySources).toBeGreaterThanOrEqual(8);
    expect(readiness.publicationRule).toContain("claim-level provenance");
    expect(getParserPlan("ncrb-crime-in-india")?.expectedRecords).toEqual(expect.arrayContaining(["report year", "state/UT table"]));
    expect(listSourceParserPlans().every((plan) => plan.provenanceHash.match(/^[a-f0-9]{64}$/))).toBe(true);
  });

  it("blocks dashboard claims that lack parser-backed provenance", async () => {
    const [source] = await queryOpenData("india-budget");
    const record = createClaimProvenance({ claim: "Budget value [VERIFY REQUIRED]", source });
    const decision = assertDashboardClaim(record);
    expect(record.status).toBe("verify_required");
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("Dashboard publication blocked");
  });

  it("allows dashboard claims only after parser and parsed record are attached", async () => {
    const [source] = await queryOpenData("india-budget");
    const record = createClaimProvenance({
      claim: "Union Budget source row is parsed from official document metadata.",
      source,
      parserKey: "india_budget",
      parsedRecord: { year: "2026-27", document: "budget-index" },
    });
    expect(record.status).toBe("publishable");
    expect(assertDashboardClaim(record).ok).toBe(true);
  });

  it("reports OpenAI as optional and governed, not a data source", () => {
    const report = getProductionSpineReport();
    expect(report.openSourceFirst).toBe(true);
    expect(report.openAiCompatible).toBe(true);
    expect(report.noSyntheticDataRule).toContain("may not invent records");
    expect(report.openAiMode).toContain("DISHA_MODEL_PROVIDER=openai");
  });
});
