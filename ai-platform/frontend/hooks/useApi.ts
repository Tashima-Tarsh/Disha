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

  const getClusterStatus = useCallback(async () => {
    return apiClient.getClusterStatus();
  }, []);

  const getRLMetrics = useCallback(async () => {
    return apiClient.getRLMetrics();
  }, []);

  const evolvePrompts = useCallback(async () => {
    return apiClient.evolvePrompts();
  }, []);

  const getEntityRankings = useCallback(async (topN?: number, entityType?: string) => {
    return apiClient.getEntityRankings(topN, entityType);
  }, []);

  const getAgentRankings = useCallback(async () => {
    return apiClient.getAgentRankings();
  }, []);

  const submitFeedback = useCallback(
    async (investigationId: string, truePositive?: boolean, rating?: number) => {
      return apiClient.submitFeedback(investigationId, truePositive, rating);
    },
    [],
  );

  return {
    investigate,
    getAlerts,
    getGraphInsights,
    getClusterStatus,
    getRLMetrics,
    evolvePrompts,
    getEntityRankings,
    getAgentRankings,
    submitFeedback,
  };
}

