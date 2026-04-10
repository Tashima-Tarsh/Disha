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
}

export const apiClient = new ApiClient();
