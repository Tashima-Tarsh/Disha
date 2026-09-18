import type { GeospatialRuntimeStatus, OperationalFeatureCollection } from "@/lib/geospatial/contracts";

export type WorkspaceMission = {
  missionId: string;
  status: string;
  riskScore: number | null;
  policyDecision: string | null;
  updatedAt: string;
};

export type WorkspaceEntity = {
  entityId: string;
  entityType: string;
  displayName: string;
  aliases: string[];
  lastSeenAt: string;
  provenanceHash: string;
};

export type WorkspaceEdge = {
  edgeId: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
  confidence: number;
  sourceHashes: string[];
  provenanceHash: string;
};

export type WorkspaceTimelineItem = {
  id: string;
  kind: "intelligence_event" | "change" | "evidence";
  timestamp: string;
  title: string;
  summary: string;
  sourceHashes: string[];
  missionId?: string | null;
  entityIds?: string[];
  provenanceHash: string;
};

export type WorkspaceEvidence = {
  nodeId: string;
  nodeKind: string;
  sourceId: string;
  sourceHash: string;
  contentHash: string;
  sourceUrl?: string | null;
  observedAt: string;
  publishedAt?: string | null;
  title?: string | null;
  provenanceHash: string;
};

export type IntelligenceWorkspace = {
  generatedAt: string;
  database: "ready" | "unconfigured" | "error";
  principal: { email: string; roles: string[] };
  counts: {
    missions: number;
    evidenceEvents: number;
    entities: number;
    edges: number;
    claims: number;
    timelineItems: number;
  };
  missions: WorkspaceMission[];
  geoStatus: GeospatialRuntimeStatus;
  geo: OperationalFeatureCollection;
  entities: WorkspaceEntity[];
  edges: WorkspaceEdge[];
  timeline: WorkspaceTimelineItem[];
  evidence: WorkspaceEvidence[];
};
