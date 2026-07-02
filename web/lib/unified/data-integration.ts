import type {
  ControlledDataConnector,
  ControlledDataQuery,
  ControlledDataResult,
  OpenDataRecord,
} from "./contracts";
import { hashValue } from "./hash";
import { listSourceRegistry, probeSources } from "./source-registry";

export const openDataSources = listSourceRegistry().map((source) => ({
  sourceId: source.sourceId,
  sourceName: source.sourceName,
  license: source.license,
  url: source.url,
  owner: source.owner,
  domain: source.domain,
  updateMode: source.updateMode,
}));

export async function queryOpenData(sourceId?: string): Promise<OpenDataRecord[]> {
  const selected = sourceId
    ? openDataSources.filter((source) => source.sourceId === sourceId)
    : openDataSources;
  const retrievedAt = new Date().toISOString();
  return selected.map((source) => ({
    ...source,
    retrievedAt,
    data: {
      status: "real_source_reference",
      note: "No synthetic dataset is returned. Use the source probe and source-specific parser before promoting facts.",
      noDemoData: true,
      verificationRequiredBeforePublication: true,
    },
    provenanceHash: hashValue({ ...source, retrievedAt }),
  }));
}

export async function queryOpenDataLiveStatus(sourceId?: string) {
  return probeSources(sourceId);
}

export class DenyByDefaultControlledConnector implements ControlledDataConnector {
  name = "deny-by-default-controlled-data";
  classificationLevel: "controlled" | "classified" = "controlled";

  async authorize(_userId: string, _missionId: string): Promise<boolean> {
    return false;
  }

  async query(request: ControlledDataQuery): Promise<ControlledDataResult> {
    return {
      connector: this.name,
      classificationLevel: this.classificationLevel,
      authorized: false,
      records: [],
      redactions: [
        `Access denied for mission ${request.missionId}. Configure an authorized deployment connector before use.`,
      ],
    };
  }

  async redact(result: ControlledDataResult, _userRole: string): Promise<ControlledDataResult> {
    return {
      ...result,
      records: [],
      redactions: [...result.redactions, "Deny-by-default connector redacts all controlled data."],
    };
  }
}

export const controlledConnector = new DenyByDefaultControlledConnector();
