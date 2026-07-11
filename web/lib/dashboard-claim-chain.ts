import type { CagAuditRecord } from "./cag-audit-connector";
import type { FinanceDocumentRecord } from "./finance-budget-connector";
import { hashValue } from "./unified/hash";

export type DashboardClaimChain = {
  claimId: string;
  title: string;
  domain: "audit" | "finance" | "geospatial" | "source-registry";
  claim: string;
  status: "publishable_metadata" | "verify_required" | "import_required";
  source: {
    authority: string;
    url: string;
    recordId: string;
  };
  policy: {
    decision: "ALLOW_METADATA" | "REQUIRE_PARSER" | "REQUIRE_IMPORT";
    reason: string;
  };
  evidence: {
    sourceRecordHash: string;
    chainHash: string;
    ledgerAction: string;
  };
  chain: Array<{
    step: "source" | "claim" | "policy" | "evidence";
    label: string;
    detail: string;
  }>;
};

export function buildCagClaimChains(records: CagAuditRecord[]): DashboardClaimChain[] {
  return records.slice(0, 8).map((record) => {
    const url = record.detailUrl ?? record.pdfUrl ?? record.source.indexUrl;
    const claim = `CAG metadata record available: ${record.title}`;
    return buildClaimChain({
      claimId: `claim-cag-${record.id}`,
      title: record.title,
      domain: "audit",
      claim,
      status: record.extractionStatus === "metadata_only" ? "verify_required" : "publishable_metadata",
      authority: record.source.authority,
      url,
      recordId: record.id,
      policyDecision: record.extractionStatus === "metadata_only" ? "REQUIRE_PARSER" : "ALLOW_METADATA",
      policyReason: "CAG index metadata is displayable; findings require PDF extraction with page provenance.",
      ledgerAction: "dashboard_cag_claim_bound",
    });
  });
}

export function buildFinanceClaimChains(records: FinanceDocumentRecord[]): DashboardClaimChain[] {
  return records.slice(0, 10).map((record) => {
    const claim = `Finance source document registered for ${record.fiscalYear}: ${record.title}`;
    return buildClaimChain({
      claimId: `claim-finance-${record.id}`,
      title: record.title,
      domain: "finance",
      claim,
      status: record.extractionStatus === "source_manifest" ? "publishable_metadata" : "verify_required",
      authority: record.authority,
      url: record.sourceUrl,
      recordId: record.id,
      policyDecision: record.extractionStatus === "source_manifest" ? "ALLOW_METADATA" : "REQUIRE_PARSER",
      policyReason: "Finance source manifests are displayable; rupee figures require table extraction and page provenance.",
      ledgerAction: "dashboard_finance_claim_bound",
    });
  });
}

export function buildGeospatialClaimChain({
  sourceHash,
  sourceCount,
  territoryCount,
}: {
  sourceHash: string;
  sourceCount: number;
  territoryCount: number;
}): DashboardClaimChain {
  return buildClaimChain({
    claimId: "claim-geospatial-india-admin-layer",
    title: "India administrative geometry layer",
    domain: "geospatial",
    claim: `${sourceCount} geospatial sources are registered for ${territoryCount} state/UT features; boundary import remains pending.`,
    status: "import_required",
    authority: "DISHA source registry",
    url: "https://github.com/datameet/maps",
    recordId: sourceHash,
    policyDecision: "REQUIRE_IMPORT",
    policyReason: "Dashboard may show source-readiness markers, but cannot publish boundary heat maps until geometry is imported with attribution and source hash.",
    ledgerAction: "dashboard_geospatial_claim_bound",
  });
}

function buildClaimChain({
  claimId,
  title,
  domain,
  claim,
  status,
  authority,
  url,
  recordId,
  policyDecision,
  policyReason,
  ledgerAction,
}: {
  claimId: string;
  title: string;
  domain: DashboardClaimChain["domain"];
  claim: string;
  status: DashboardClaimChain["status"];
  authority: string;
  url: string;
  recordId: string;
  policyDecision: DashboardClaimChain["policy"]["decision"];
  policyReason: string;
  ledgerAction: string;
}): DashboardClaimChain {
  const sourceRecordHash = hashValue({ authority, url, recordId, claim });
  const chainHash = hashValue({ claimId, domain, status, sourceRecordHash, policyDecision, ledgerAction });

  return {
    claimId,
    title,
    domain,
    claim,
    status,
    source: { authority, url, recordId },
    policy: { decision: policyDecision, reason: policyReason },
    evidence: { sourceRecordHash, chainHash, ledgerAction },
    chain: [
      { step: "source", label: authority, detail: url },
      { step: "claim", label: title, detail: claim },
      { step: "policy", label: policyDecision, detail: policyReason },
      { step: "evidence", label: ledgerAction, detail: chainHash },
    ],
  };
}
