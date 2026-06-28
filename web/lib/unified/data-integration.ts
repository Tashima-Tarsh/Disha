import type {
  ControlledDataConnector,
  ControlledDataQuery,
  ControlledDataResult,
  OpenDataRecord,
} from "./contracts";
import { hashValue } from "./hash";

export const openDataSources = [
  {
    sourceId: "cag-audit-index",
    sourceName: "Comptroller and Auditor General audit reports",
    license: "Official public website terms",
    url: "https://cag.gov.in/en/audit-report",
  },
  {
    sourceId: "india-budget",
    sourceName: "India Budget, Ministry of Finance",
    license: "Official public website terms",
    url: "https://www.indiabudget.gov.in/",
  },
  {
    sourceId: "data-gov-in",
    sourceName: "Open Government Data Platform India",
    license: "Government Open Data License - India",
    url: "https://www.data.gov.in/apis",
  },
  {
    sourceId: "lgd",
    sourceName: "Local Government Directory",
    license: "Official public directory",
    url: "https://lgdirectory.gov.in/",
  },
  {
    sourceId: "bhuvan",
    sourceName: "Bhuvan geospatial services",
    license: "Official public service terms",
    url: "https://bhuvan-app1.nrsc.gov.in/api/",
  },
];

export async function queryOpenData(sourceId?: string): Promise<OpenDataRecord[]> {
  const selected = sourceId
    ? openDataSources.filter((source) => source.sourceId === sourceId)
    : openDataSources;
  const retrievedAt = new Date().toISOString();
  return selected.map((source) => ({
    ...source,
    retrievedAt,
    data: {
      status: "source_manifest",
      note: "Connector preserves source identity; dataset-specific ingestion runs through provenance checks.",
    },
    provenanceHash: hashValue({ ...source, retrievedAt }),
  }));
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
