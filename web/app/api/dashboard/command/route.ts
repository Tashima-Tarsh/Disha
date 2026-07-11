import { NextRequest, NextResponse } from "next/server";

import { fetchCagAuditRecords, type CagAuditFetchResult } from "@/lib/cag-audit-connector";
import { fetchFinanceBudgetRecords, type FinanceBudgetResult } from "@/lib/finance-budget-connector";
import { getGovernedExtensionControlPlane } from "@/lib/extensions";
import { territories, type Territory } from "@/lib/india-dashboard-data";
import { nationalConnectors } from "@/lib/national-connectors";
import { nationalDataCoverage, nationalDataSources } from "@/lib/national-data-registry";
import { requirePrincipal } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/http";
import { getProductionSpineReport } from "@/lib/unified/production-spine";
import { listSourceRegistry } from "@/lib/unified/source-registry";

export const dynamic = "force-dynamic";

type CommandLane = {
  id: string;
  title: string;
  posture: "operational" | "watch" | "blocked";
  scope: string;
  primaryAuthority: string;
  sourceCount: number;
  evidenceMode: string;
};

export async function GET(req: NextRequest) {
  try {
    const principal = requirePrincipal(req);
    const generatedAt = new Date().toISOString();
    const [cag, finance] = await Promise.all([
      sourceWithTimeout(
        fetchCagAuditRecords({ yearFrom: 2015, yearTo: new Date().getFullYear(), maxPages: 1 }),
        fallbackCag(generatedAt, "CAG public source timed out or was unavailable during this command-feed request."),
      ),
      sourceWithTimeout(
        fetchFinanceBudgetRecords({ yearFrom: 2015, yearTo: 2026, probe: false }),
        fallbackFinance(generatedAt, "Finance source manifest timed out or was unavailable during this command-feed request."),
      ),
    ]);
    const sourceCoverage = nationalDataCoverage();
    const production = getProductionSpineReport();
    const extensions = getGovernedExtensionControlPlane();
    const sourceRegistry = listSourceRegistry();
    const india = buildIndiaCommandLayer(territories);
    const lanes = buildCommandLanes();

    return NextResponse.json({
      generatedAt,
      principal: {
        email: principal.email,
        roles: principal.roles,
      },
      title: "DISHA 6.6 National Command Feed",
      invariant:
        "Every dashboard claim is sourced from the DISHA registry, connector output, policy state, or evidence-readiness contract. Missing official data is shown as a task, not invented as a metric.",
      commandReadiness: {
        score: Math.round(((production.capabilityScore * 0.45) + (extensions.score * 0.35) + (sourceCoverage.readyForConnector / Math.max(sourceCoverage.total, 1)) * 0.2) * 100),
        productionScore: Math.round(production.capabilityScore * 100),
        extensionScore: Math.round(extensions.score * 100),
        sourceRegistry: sourceRegistry.length,
        nationalSources: sourceCoverage.total,
        connectorManifest: nationalConnectors.length,
      },
      governance: {
        policyGate: "enabled",
        evidenceLedger: "enabled",
        noSyntheticData: true,
        extensionStatus: extensions.status,
        extensionBlockers: extensions.blockers,
        extensionWarnings: extensions.warnings,
      },
      lanes,
      india,
      audit: {
        generatedAt: cag.generatedAt,
        authority: cag.source.authority,
        sourceNotice: cag.sourceNotice,
        fetchedRecords: cag.coverage.fetchedRecords,
        matchedRecords: cag.coverage.matchedRecords,
        pdfLinks: cag.coverage.pdfLinks,
        findingExtraction: cag.coverage.findingExtraction,
        records: cag.records.slice(0, 8).map((record) => ({
          id: record.id,
          title: record.title,
          government: record.government,
          reportYear: record.reportYear,
          topics: record.topics,
          detailUrl: record.detailUrl,
          pdfUrl: record.pdfUrl,
          extractionStatus: record.extractionStatus,
        })),
      },
      finance: {
        generatedAt: finance.generatedAt,
        sourceNotice: finance.sourceNotice,
        fiscalYears: finance.coverage.fiscalYears,
        documentRecords: finance.coverage.documentRecords,
        taxCollectionDocuments: finance.coverage.taxCollectionDocuments,
        stateDevolutionDocuments: finance.coverage.stateDevolutionDocuments,
        departmentDocuments: finance.coverage.departmentDocuments,
        extraction: finance.coverage.extraction,
        records: finance.records.slice(0, 10).map((record) => ({
          id: record.id,
          fiscalYear: record.fiscalYear,
          title: record.title,
          dataNeed: record.dataNeed,
          sourceUrl: record.sourceUrl,
          extractionStatus: record.extractionStatus,
        })),
      },
      connectors: nationalConnectors.map((connector) => ({
        id: connector.id,
        label: connector.label,
        layer: connector.layer,
        authority: connector.authority,
        cadence: connector.cadence,
        kind: connector.kind,
        needsApiKey: connector.needsApiKey,
        needsBulkImport: connector.needsBulkImport,
        endpoint: connector.endpoint,
        safetyBoundary: connector.safetyBoundary,
      })),
      production: {
        generatedAt: production.generatedAt,
        noSyntheticDataRule: production.noSyntheticDataRule,
        capabilities: production.capabilities.map((capability) => ({
          id: capability.id,
          title: capability.title,
          status: capability.status,
          evidenceRule: capability.evidenceRule,
          nextHardening: capability.nextHardening,
        })),
      },
      extensions: {
        generatedAt: extensions.generatedAt,
        activeExtensions: extensions.activeExtensions,
        gates: extensions.gates,
      },
      sourceRegistry: sourceRegistry.slice(0, 16).map((source) => ({
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        owner: source.owner,
        domain: source.domain,
        sourceType: source.sourceType,
        updateMode: source.updateMode,
        endpoints: source.endpoints.length,
        limitations: source.knownLimitations,
      })),
    });
  } catch (error) {
    return errorResponse(error, req);
  }
}

function buildCommandLanes(): CommandLane[] {
  const byLayer = new Map<string, typeof nationalConnectors>();
  for (const connector of nationalConnectors) {
    byLayer.set(connector.layer, [...(byLayer.get(connector.layer) ?? []), connector]);
  }

  return Array.from(byLayer.entries()).map(([layer, connectors]) => {
    const requiresBulk = connectors.some((connector) => connector.needsBulkImport);
    const requiresKey = connectors.some((connector) => connector.needsApiKey);
    return {
      id: stableLaneId(layer),
      title: layer,
      posture: requiresBulk ? "watch" : requiresKey ? "watch" : "operational",
      scope: connectors.map((connector) => connector.label).slice(0, 3).join(" / "),
      primaryAuthority: connectors[0]?.authority ?? "Source registry",
      sourceCount: connectors.length,
      evidenceMode: requiresBulk
        ? "Bulk import and provenance parser required"
        : requiresKey
          ? "API-key source ingestion required"
          : "Connector-ready source monitor",
    };
  });
}

function buildIndiaCommandLayer(items: Territory[]) {
  const regionSummary = items.reduce<Record<string, { total: number; states: number; uts: number }>>((acc, item) => {
    const current = acc[item.region] ?? { total: 0, states: 0, uts: 0 };
    current.total += 1;
    if (item.kind === "State") current.states += 1;
    if (item.kind === "Union Territory") current.uts += 1;
    acc[item.region] = current;
    return acc;
  }, {});

  return {
    totalTerritories: items.length,
    states: items.filter((item) => item.kind === "State").length,
    unionTerritories: items.filter((item) => item.kind === "Union Territory").length,
    mapMode: "administrative-source-readiness",
    geometryStatus: "official_geojson_not_yet_committed",
    regionSummary,
    territories: items.map((item) => ({
      name: item.name,
      kind: item.kind,
      region: item.region,
      posture: "watch",
      evidenceCoverage: item.evidence,
      commandTask: "Bind official LGD/state source rows and map geometry before incident heat-map publication.",
    })),
  };
}

function stableLaneId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function sourceWithTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs = 9000): Promise<T> {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
    ]);
  } catch {
    return fallback;
  }
}

function fallbackCag(generatedAt: string, reason: string): CagAuditFetchResult {
  return {
    generatedAt,
    sourceNotice: `Official CAG audit-report metadata feed. ${reason}`,
    query: {
      yearFrom: 2015,
      yearTo: new Date().getFullYear(),
      topics: [],
      startPage: 1,
      pagesFetched: 0,
      maxPages: 1,
    },
    source: {
      authority: "Comptroller and Auditor General of India",
      indexUrl: "https://cag.gov.in/en/audit-report",
      totalRecordsOnSite: null,
      paginationLastPage: null,
    },
    coverage: {
      fetchedRecords: 0,
      matchedRecords: 0,
      pdfLinks: 0,
      findingExtraction: "requires_pdf_text_extraction_with_page_provenance",
    },
    records: [],
  };
}

function fallbackFinance(generatedAt: string, reason: string): FinanceBudgetResult {
  return {
    generatedAt,
    sourceNotice: `Official Ministry of Finance source manifest. ${reason}`,
    query: {
      yearFrom: 2015,
      yearTo: 2026,
      probe: false,
    },
    coverage: {
      fiscalYears: 0,
      documentRecords: 0,
      taxCollectionDocuments: 0,
      stateDevolutionDocuments: 0,
      departmentDocuments: 0,
      extraction: "requires_pdf_table_extraction_with_page_and_table_provenance",
    },
    records: [],
    probes: [],
  };
}
