export interface Alert {
  alert_id: string;
  level: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  source: string;
  entity_id?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface Entity {
  id: string;
  label: string;
  entity_type: string;
  properties: Record<string, unknown>;
  risk_score: number;
}

export interface Relationship {
  source_id: string;
  target_id: string;
  relationship_type: string;
  confidence: number;
}

export interface Investigation {
  investigation_id: string;
  target: string;
  investigation_type: string;
  status: string;
  entities: Entity[];
  relationships: Relationship[];
  anomalies: Record<string, unknown>[];
  risk_score: number;
  summary: string;
  timestamp?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  risk: number;
  val?: number;
  color?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}
