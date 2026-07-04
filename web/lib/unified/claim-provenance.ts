import { hashValue } from "./hash";
import type { OpenDataRecord } from "./contracts";

export type ClaimPublicationStatus = "publishable" | "verify_required" | "blocked";

export type ClaimProvenanceRecord = {
  claimId: string;
  claim: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  sourceRecordHash: string;
  parserKey?: string;
  retrievedAt: string;
  status: ClaimPublicationStatus;
  reasons: string[];
  provenanceHash: string;
};

export function createClaimProvenance(input: {
  claim: string;
  source: OpenDataRecord;
  parserKey?: string;
  parsedRecord?: unknown;
}): ClaimProvenanceRecord {
  const reasons: string[] = [];
  if (!input.parserKey) reasons.push("No parser key is attached to this source record.");
  if (!input.parsedRecord) reasons.push("No parsed source record is attached.");
  if (String(input.claim).includes("[VERIFY REQUIRED]")) reasons.push("Claim is explicitly marked verify required.");
  const status: ClaimPublicationStatus = reasons.length ? "verify_required" : "publishable";
  const sourceRecordHash = hashValue({
    sourceId: input.source.sourceId,
    retrievedAt: input.source.retrievedAt,
    data: input.parsedRecord ?? input.source.data,
  });
  const base = {
    claimId: hashValue({ claim: input.claim, sourceRecordHash }).slice(0, 24),
    claim: input.claim,
    sourceId: input.source.sourceId,
    sourceName: input.source.sourceName,
    sourceUrl: input.source.url,
    sourceRecordHash,
    parserKey: input.parserKey,
    retrievedAt: input.source.retrievedAt,
    status,
    reasons,
  };
  return { ...base, provenanceHash: hashValue(base) };
}

export function assertDashboardClaim(record: ClaimProvenanceRecord): { ok: boolean; reason: string } {
  if (record.status !== "publishable") {
    return { ok: false, reason: `Dashboard publication blocked: ${record.reasons.join("; ") || "claim is not publishable"}` };
  }
  if (!record.parserKey) {
    return { ok: false, reason: "Dashboard publication blocked: missing parser key." };
  }
  return { ok: true, reason: "Claim has parser-backed provenance." };
}
