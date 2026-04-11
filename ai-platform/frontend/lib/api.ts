const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T | null> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
      };

      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        return null;
      }

      return response.json();
    } catch (error) {
      console.error("API request failed:", error);
      return null;
    }
  }

  async login(email: string, password: string) {
    return this.fetch<{ access_token: string; user_id: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
  }

  async register(email: string, password: string) {
    return this.fetch<{ access_token: string; user_id: string }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
  }

  async investigate(target: string, type: string = "full") {
    return this.fetch<Record<string, unknown>>("/investigate", {
      method: "POST",
      body: JSON.stringify({
        target,
        investigation_type: type,
        depth: 2,
      }),
    });
  }

  async getAlerts(limit: number = 50) {
    return this.fetch<{ alerts: Record<string, unknown>[] }>(
      `/alerts?limit=${limit}`,
    );
  }

  async getGraphInsights(entityId?: string, type: string = "centrality") {
    return this.fetch<Record<string, unknown>>("/graph-insights", {
      method: "POST",
      body: JSON.stringify({
        entity_id: entityId,
        insight_type: type,
      }),
    });
  }

  async healthCheck() {
    return this.fetch<{ status: string; version: string }>("/health");
  }

  // --- Multimodal Analysis ---

  async analyzeVision(target: string, analysisType: string = "classify", imageData?: string) {
    return this.fetch<Record<string, unknown>>("/analyze/vision", {
      method: "POST",
      body: JSON.stringify({
        target,
        analysis_type: analysisType,
        image_data: imageData,
      }),
    });
  }

  async analyzeAudio(target: string, analysisType: string = "transcribe", audioData?: string) {
    return this.fetch<Record<string, unknown>>("/analyze/audio", {
      method: "POST",
      body: JSON.stringify({
        target,
        analysis_type: analysisType,
        audio_data: audioData,
      }),
    });
  }

  async analyzeMultimodal(params: {
    target: string;
    imageUrl?: string;
    audioUrl?: string;
    investigationType?: string;
  }) {
    return this.fetch<Record<string, unknown>>("/analyze/multimodal", {
      method: "POST",
      body: JSON.stringify({
        target: params.target,
        image_url: params.imageUrl,
        audio_url: params.audioUrl,
        investigation_type: params.investigationType || "full",
      }),
    });
  }

  // --- Collaborative Investigation ---

  async collaborativeInvestigate(target: string, taskDescription?: string) {
    return this.fetch<Record<string, unknown>>("/investigate/collaborative", {
      method: "POST",
      body: JSON.stringify({
        target,
        task_description: taskDescription || `Investigate: ${target}`,
      }),
    });
  }

  async getClusterStatus() {
    return this.fetch<Record<string, unknown>>("/cluster/status");
  }

  // --- RL Feedback ---

  async submitFeedback(investigationId: string, truePositive?: boolean, rating?: number) {
    return this.fetch<Record<string, unknown>>("/feedback", {
      method: "POST",
      body: JSON.stringify({
        investigation_id: investigationId,
        true_positive: truePositive,
        user_rating: rating,
      }),
    });
  }

  async getRLMetrics() {
    return this.fetch<Record<string, unknown>>("/rl/metrics");
  }

  async evolvePrompts() {
    return this.fetch<Record<string, unknown>>("/rl/evolve-prompts", {
      method: "POST",
    });
  }

  // --- Intelligence Ranking ---

  async getEntityRankings(topN: number = 50, entityType?: string) {
    return this.fetch<{ rankings: Record<string, unknown>[]; total: number }>(
      "/rankings/entities",
      {
        method: "POST",
        body: JSON.stringify({
          top_n: topN,
          entity_type: entityType,
        }),
      },
    );
  }

  async getAgentRankings() {
    return this.fetch<Record<string, unknown>>("/rankings/agents");
  }
}

export const apiClient = new ApiClient();
