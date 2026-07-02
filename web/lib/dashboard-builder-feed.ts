import { getConstitutionalCore } from "./unified/constitutional-core";
import { listSourceRegistry } from "./unified/source-registry";

export function getDashboardBuilderPayload() {
  const sources = listSourceRegistry();
  const core = getConstitutionalCore();
  const domains = Array.from(new Set(sources.map((source) => source.domain))).map((domain) => {
    const domainSources = sources.filter((source) => source.domain === domain);
    return {
      domain,
      total: domainSources.length,
      apiPull: domainSources.filter((source) => source.updateMode === "api_pull").length,
      parserRequired: domainSources.filter((source) => source.updateMode !== "live_probe").length,
      sourceIds: domainSources.map((source) => source.sourceId),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    title: "DISHA Constitutional Evidence Builder",
    notice: "No demo data. Counts describe registered official/public sources, proof pillars, and parser readiness, not government statistics.",
    sources,
    core,
    domains,
    metrics: {
      sources: sources.length,
      pillars: core.length,
      domains: domains.length,
      parserBacklog: sources.filter((source) => source.updateMode !== "live_probe").length,
      liveProbeReady: sources.filter((source) => source.updateMode === "live_probe").length,
      authOrReviewRequired: sources.filter((source) => source.endpoints.some((endpoint) => endpoint.requiresAuth) || source.updateMode === "manual_review_required").length,
    },
  };
}

export type DashboardBuilderPayload = ReturnType<typeof getDashboardBuilderPayload>;
