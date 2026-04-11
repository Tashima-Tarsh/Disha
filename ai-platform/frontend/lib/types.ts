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

// --- Intelligence Ranking ---

export interface RankedEntity {
  entity_id: string;
  label: string;
  entity_type: string;
  composite_score: number;
  threat_score: number;
  impact_score: number;
  confidence_score: number;
  centrality_score: number;
  recency_score: number;
  times_seen: number;
  sources: string[];
}

export interface AgentRanking {
  agent_name: string;
  reliability_score: number;
  precision: number;
  recall: number;
  f1_score: number;
  total_investigations: number;
  avg_time: number;
}

// --- RL Metrics ---

export interface RLMetrics {
  reward_metrics: {
    total_episodes: number;
    avg_reward: number;
    reward_std: number;
    true_positive_rate: number;
    false_positive_rate: number;
    total_feedback: number;
  };
  prompt_metrics: {
    generation: number;
    prompt_types: Record<string, {
      variants: number;
      total_uses: number;
      best_score: number;
    }>;
  };
}

// --- Cluster Status ---

export interface ClusterStatus {
  total_agents: number;
  online_agents: number;
  busy_agents: number;
  agents: Record<string, {
    status: string;
    capabilities: string[];
    tasks_completed: number;
    avg_response_time: number;
  }>;
}
