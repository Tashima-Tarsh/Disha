import { readFile } from "node:fs/promises";
import path from "node:path";

export type ExternalRepoRuntimeStatus = {
  id: string;
  nameWithOwner: string;
  url: string;
  localPath: string;
  license: string;
  defensiveLabOnly: boolean;
  present: boolean;
  branch: string;
  commit: string;
  remote: string;
  topLevelFiles: string[];
  syncedAt: string;
};

export type ExternalRepoRuntimePayload = {
  generatedAt: string;
  runtimeRoot: string;
  rule: string;
  repositories: ExternalRepoRuntimeStatus[];
};

export type ExternalRuntimeServiceStatus = {
  id: string;
  repoId: string;
  label: string;
  mode: string;
  url: string | null;
  cwd: string;
  command: string;
  synced: boolean;
  commandAvailable: boolean;
  live: boolean;
  statusCode: number | null;
  startedPid: number | null;
  notes: string | null;
};

export type ExternalRuntimePayload = {
  generatedAt: string;
  rule: string;
  services: ExternalRuntimeServiceStatus[];
};

export async function readExternalIntelligenceRuntimeStatus(): Promise<ExternalRepoRuntimePayload | null> {
  try {
    const statusPath = path.join(process.cwd(), "..", ".disha", "external-intelligence", "status.json");
    const raw = await readFile(statusPath, "utf8");
    return JSON.parse(raw) as ExternalRepoRuntimePayload;
  } catch {
    return null;
  }
}

export async function readExternalServiceRuntimeStatus(): Promise<ExternalRuntimePayload | null> {
  try {
    const statusPath = path.join(process.cwd(), "..", ".disha", "external-intelligence", "runtime-status.json");
    const raw = await readFile(statusPath, "utf8");
    return JSON.parse(raw) as ExternalRuntimePayload;
  } catch {
    return null;
  }
}
