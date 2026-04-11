"use client";

import { useCallback } from "react";
import { apiClient } from "@/lib/api";

export function useApi() {
  const investigate = useCallback(
    async (target: string, type: string = "full") => {
      return apiClient.investigate(target, type);
    },
    [],
  );

  const getAlerts = useCallback(async (limit: number = 50) => {
    return apiClient.getAlerts(limit);
  }, []);

  const getGraphInsights = useCallback(
    async (entityId?: string, type?: string) => {
      return apiClient.getGraphInsights(entityId, type);
    },
    [],
  );

  return { investigate, getAlerts, getGraphInsights };
}
