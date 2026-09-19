import {
  listOsintSourceUniverse,
  type OsintSourceUniverseEntry,
} from "./osint-source-universe";

export const restrictedOsintSourceIds = [
  "ddosecrets",
  "wikileaks",
  "intelligence-x",
  "dehashed",
] as const;

export type RestrictedOsintSourceId = typeof restrictedOsintSourceIds[number];

export type RestrictedOsintConfiguration = {
  sourceId: RestrictedOsintSourceId;
  envApprovalFlag: string;
  approvalRecorded: boolean;
  executable: false;
  status: "blocked_by_default" | "approval_recorded_execution_blocked";
  reason: string;
};

export type RestrictedOsintPosture = {
  source: OsintSourceUniverseEntry;
  configuration: RestrictedOsintConfiguration;
  permittedUse: string[];
  prohibitedUse: string[];
  requiredControls: string[];
  outputPolicy: {
    allowed: string[];
    neverReturn: string[];
  };
};

const requiredControls = [
  "Written legal basis or client authorization for this exact source and matter",
  "Named analyst and mission purpose before any review workflow",
  "Human approval before source access outside DISHA",
  "No automated bulk download or mirroring of leaked/private datasets",
  "No plaintext passwords, tokens, secrets, private keys, or credential material in DISHA storage",
  "No private personal data ingestion unless a separate lawful data-processing basis is recorded",
  "Evidence ledger must store source references, timestamps, hashes, and analyst notes only",
  "Retention, redaction, and deletion path must be defined before operational use",
];

const permittedUse = [
  "Catalog discovery and risk labeling",
  "Legal-review tracking",
  "Source-reference recording after human review",
  "High-level metadata such as source name, collection date, URL, hash, and analyst summary",
  "Defensive notification that a third-party breach/exposure source may require separate review",
];

const prohibitedUse = [
  "Automated ingestion of leaked archives or private records",
  "Credential, password, token, secret, API key, or private-key retrieval",
  "Bulk search of personal emails, phone numbers, usernames, addresses, or identity records",
  "Replication of breach databases into DISHA",
  "Bypassing provider terms, paywalls, access controls, or jurisdictional restrictions",
  "Operational use without a recorded lawful purpose and approval trail",
];

const allowedOutput = [
  "source id and name",
  "source home URL",
  "risk and mode",
  "approval/configuration status",
  "non-sensitive analyst summary",
  "non-sensitive source citation or reference URL when lawful to retain",
  "cryptographic hash of reviewed evidence when available",
];

const neverReturn = [
  "plaintext passwords",
  "password hashes intended for cracking",
  "session cookies or tokens",
  "API keys or private keys",
  "full breach rows or dumps",
  "private personal records from leaked datasets",
  "instructions for bypassing access controls",
];

export function getRestrictedOsintConfiguration(sourceId: RestrictedOsintSourceId): RestrictedOsintConfiguration {
  const envApprovalFlag = `DISHA_RESTRICTED_SOURCE_${sourceId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_APPROVED`;
  const approvalRecorded = process.env[envApprovalFlag] === "true";
  return {
    sourceId,
    envApprovalFlag,
    approvalRecorded,
    executable: false,
    status: approvalRecorded ? "approval_recorded_execution_blocked" : "blocked_by_default",
    reason: approvalRecorded
      ? "Approval metadata is recorded, but automated ingestion remains disabled. Use a separate reviewed workflow for lawful, redacted metadata only."
      : "No approval metadata recorded. Source remains blocked and non-executable.",
  };
}

export function listRestrictedOsintPosture(): RestrictedOsintPosture[] {
  const entries = listOsintSourceUniverse();
  return restrictedOsintSourceIds.map((sourceId) => {
    const source = entries.find((entry) => entry.id === sourceId);
    if (!source) throw new Error(`restricted_source_missing:${sourceId}`);
    return {
      source,
      configuration: getRestrictedOsintConfiguration(sourceId),
      permittedUse,
      prohibitedUse,
      requiredControls,
      outputPolicy: {
        allowed: allowedOutput,
        neverReturn,
      },
    };
  });
}

export function getRestrictedOsintSummary() {
  const posture = listRestrictedOsintPosture();
  return {
    total: posture.length,
    blocked: posture.filter((item) => item.source.mode === "blocked_by_default" && item.configuration.executable === false).length,
    approvalRecorded: posture.filter((item) => item.configuration.approvalRecorded).length,
    executable: 0,
    rule: "Restricted leak, breach, and credential-exposure sources are cataloged for governance only. DISHA does not auto-ingest leaked/private data or credential material.",
  };
}
