"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  FileClock,
  FileSearch,
  Filter,
  Gavel,
  Layers3,
  LockKeyhole,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

import { regions, territories } from "@/lib/india-dashboard-data";
import type { DashboardBuilderPayload } from "@/lib/dashboard-builder-feed";

import styles from "./dashboard.module.css";

type ClientProps = { initialPayload: DashboardBuilderPayload };
type Geometry = { type: "Polygon" | "MultiPolygon" | "LineString" | "MultiLineString"; coordinates: number[][] | number[][][] | number[][][][] };
type GeoFeature = { properties: { st_nm?: string; district?: string }; geometry: Geometry };
type GeoJson = { features: GeoFeature[] };
type MapFeature = { id: string; stateName: string; district: string; path: string };
type FlowNode = { id: string; label: string; x: number; y: number; level: "central" | "state" | "district" | "source"; value: number };
type KpiKey = "sources" | "years" | "crime" | "typologies" | "parser" | "probe" | "review" | "policy";
type DashboardSource = DashboardBuilderPayload["sources"][number];
type DashboardDomain = DashboardBuilderPayload["domains"][number];

const INDIA_BOUNDS = { minLon: 67, maxLon: 98.5, minLat: 5.5, maxLat: 37.5 };
const VIEWBOX = { width: 760, height: 820 };

const levelColor = {
  central: "#1d4ed8",
  state: "#0f766e",
  district: "#7c3aed",
  source: "#475569",
};

const domainIcons: Record<string, LucideIcon> = {
  constitution: BookOpen,
  law_code: Gavel,
  gazette: FileSearch,
  parliament: ShieldCheck,
  audit: ShieldCheck,
  finance: Database,
  tax: Database,
  geospatial: MapPinned,
  water: Activity,
  disaster: AlertCircle,
  crime: Gavel,
};

export default function DashboardClient({ initialPayload }: ClientProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [region, setRegion] = useState<(typeof regions)[number]>("All India");
  const [domain, setDomain] = useState("all");
  const [activeKpi, setActiveKpi] = useState<KpiKey>("crime");
  const [query, setQuery] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState(initialPayload.sources[0]?.sourceId ?? "");
  const [mapFeatures, setMapFeatures] = useState<MapFeature[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadMap() {
      const response = await fetch("/data/india-districts.geojson");
      const geojson = (await response.json()) as GeoJson;
      if (alive) setMapFeatures(buildMapFeatures(geojson));
    }
    loadMap().catch(() => setMapFeatures([]));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      setRefreshing(true);
      try {
        const response = await fetch("/api/dashboard/builder", { cache: "no-store" });
        const next = (await response.json()) as DashboardBuilderPayload;
        if (alive) setPayload(next);
      } finally {
        if (alive) setRefreshing(false);
      }
    }
    const interval = window.setInterval(refresh, 30000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);

  const domains = payload.domains.map((item) => item.domain);
  const filteredSources = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payload.sources.filter((source) => {
      const domainMatch = domain === "all" || source.domain === domain;
      const queryMatch = !q || [source.sourceName, source.owner, source.domain, source.sourceId].some((value) => value.toLowerCase().includes(q));
      return domainMatch && queryMatch;
    });
  }, [payload.sources, query, domain]);
  const filteredDomains = useMemo(() => groupDomains(filteredSources), [filteredSources]);
  const selectedSource = filteredSources.find((source) => source.sourceId === selectedSourceId) ?? filteredSources[0];
  const selectedPillar = payload.core.find((pillar) => selectedSource && pillar.sourceIds.includes(selectedSource.sourceId)) ?? payload.core[0];
  const crimeCyberSources = filteredSources.filter((source) => ["crime", "cybercrime", "cyber_incident", "consumer_finance_protection"].includes(source.domain));
  const officialSourceYears = 2026 - 2012 + 1;
  const activeModel = getKpiModel(activeKpi, filteredSources, filteredDomains, crimeCyberSources.length);
  const activeTerritories = useMemo(() => new Set(territories.filter((item) => region === "All India" || item.region === region).map((item) => normalizeName(item.name))), [region]);
  const flowNodes = useMemo(() => makeFlowNodes(filteredDomains), [filteredDomains]);
  const selectedCoverage = getSourceMapCoverage(selectedSource);
  const lastUpdated = new Date(payload.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <main className={styles.page}>
      <section className={styles.frame} aria-labelledby="dashboard-title">
        <header className={styles.topBar}>
          <div>
            <p>DISHA live command surface</p>
            <h1 id="dashboard-title">DISHA 6.6 : Intelligence Architecture System</h1>
          </div>
          <div className={styles.liveBadge}>
            <span />
            <strong>REGISTRY</strong>
            <em>{lastUpdated}</em>
          </div>
        </header>

        <aside className={styles.leftRail}>
          <div className={styles.railTitle}><Filter aria-hidden="true" /> Report controls</div>
          <label><span>Region</span><select value={region} onChange={(event) => setRegion(event.target.value as (typeof regions)[number])}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Layer</span><select value={domain} onChange={(event) => setDomain(event.target.value)}><option value="all">All layers</option>{domains.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></label>
          <label><span>Search</span><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registered source" /></label>
          <div className={styles.layerStack}>
            {payload.core.map((pillar, index) => (
              <button
                key={pillar.id}
                type="button"
                data-active={selectedPillar?.id === pillar.id}
                onClick={() => {
                  setDomain("all");
                  setSelectedSourceId(pillar.sourceIds[0] ?? selectedSourceId);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{pillar.title}</strong>
                <em>{pillar.sourceIds.length} sources</em>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.mapStage}>
          <div className={styles.mapToolbar}>
            <Kpi id="sources" active={activeKpi} onSelect={setActiveKpi} icon={Database} label="Visible sources" value={filteredSources.length} />
            <Kpi id="years" active={activeKpi} onSelect={setActiveKpi} icon={FileClock} label="2012-2026 years" value={officialSourceYears} />
            <Kpi id="crime" active={activeKpi} onSelect={setActiveKpi} icon={Gavel} label="Crime/cyber lanes" value={crimeCyberSources.length} />
            <Kpi id="typologies" active={activeKpi} onSelect={setActiveKpi} icon={AlertCircle} label="Scam typologies" value={6} />
            <Kpi id="parser" active={activeKpi} onSelect={setActiveKpi} icon={Workflow} label="Parser queue" value={filteredSources.filter((source) => source.updateMode !== "live_probe").length} />
            <Kpi id="probe" active={activeKpi} onSelect={setActiveKpi} icon={Activity} label="Probe ready" value={filteredSources.filter((source) => source.updateMode === "live_probe").length} />
            <Kpi id="review" active={activeKpi} onSelect={setActiveKpi} icon={LockKeyhole} label="Review gates" value={filteredSources.filter((source) => source.endpoints.some((endpoint) => endpoint.requiresAuth) || source.updateMode === "manual_review_required").length} />
            <Kpi id="policy" active={activeKpi} onSelect={setActiveKpi} icon={ShieldCheck} label="Policy/evidence gates" value={6} />
          </div>
          <div className={styles.mapCanvas}>
            <IndiaMap activeNames={activeTerritories} features={mapFeatures} coverage={selectedCoverage} />
            <svg className={styles.liveOverlay} viewBox="0 0 760 820" aria-hidden="true">
              <path className={styles.arcA} d="M380 396 C282 230 218 175 118 102" />
              <path className={styles.arcB} d="M380 396 C505 220 578 190 690 116" />
              <path className={styles.arcC} d="M380 396 C255 482 196 575 106 744" />
              <path className={styles.arcD} d="M380 396 C488 512 565 602 664 748" />
              <path className={styles.arcE} d="M380 396 C385 300 375 212 382 82" />
              {flowNodes.map((node, index) => (
                <g key={node.id} className={styles.flowNode}>
                  <circle cx={node.x} cy={node.y} r={node.value} fill={levelColor[node.level]} />
                  <text x={node.x + node.value + 8} y={node.y + 4}>{node.label}</text>
                </g>
              ))}
              <circle className={styles.pulseCore} cx="380" cy="396" r="13" />
            </svg>
            <div className={styles.mapLegend}>
              <span><i data-level="central" /> Selected source: {selectedSource?.sourceName ?? "none"}</span>
              <span><i data-level="state" /> Geography: {selectedCoverage.label}</span>
              <span><i data-level="district" /> Region filter: {region}</span>
              <span><i data-level="source" /> No district incident counts displayed</span>
            </div>
          </div>
        </section>

        <aside className={styles.rightRail}>
          <div className={styles.railHeader}>
            <Layers3 aria-hidden="true" />
            <div><span>Active source feed</span><strong>{filteredSources.length} visible</strong></div>
            <RefreshCw aria-hidden="true" className={refreshing ? styles.spin : ""} />
          </div>
          <div className={styles.sourceFeed}>
            {!filteredSources.length && <p className={styles.emptyState}>No registered source matches the current filters.</p>}
            {filteredSources.slice(0, 15).map((source) => {
              const Icon = domainIcons[source.domain] ?? Database;
              return (
                <button key={source.sourceId} type="button" data-active={source.sourceId === selectedSource?.sourceId} onClick={() => setSelectedSourceId(source.sourceId)}>
                  <Icon aria-hidden="true" />
                  <span>{labelize(source.domain)}</span>
                  <strong>{source.sourceName}</strong>
                  <em>{source.updateMode.replaceAll("_", " ")}</em>
                  <i>{source.sourceType.replaceAll("_", " ")}</i>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={styles.bottomDeck}>
          <article>
            <h2>{activeModel.title}</h2>
            <strong>{activeModel.question}</strong>
            <p>{activeModel.explanation}</p>
            <div className={styles.microGrid}>
              {activeModel.metrics.map((item) => <span key={item.label}>{item.label} <b>{item.value}</b></span>)}
            </div>
          </article>
          <article>
            <h2>Readiness calculation path</h2>
            <LineChart labels={activeModel.steps} values={activeModel.trend} hotIndex={-1} />
          </article>
          <article>
            <h2>{activeModel.heatTitle}</h2>
            <div className={styles.chartGrid}>
              <BarChart rows={activeModel.bars} />
              <DonutChart rows={activeModel.bars.slice(0, 5)} />
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function Kpi({ id, active, onSelect, icon: Icon, label, value }: { id: KpiKey; active: KpiKey; onSelect: (id: KpiKey) => void; icon: LucideIcon; label: string; value: number }) {
  return <button type="button" className={styles.kpi} data-active={active === id} onClick={() => onSelect(id)}><Icon aria-hidden="true" /><span>{label}</span><strong>{value}</strong></button>;
}

function getKpiModel(active: KpiKey, sources: DashboardSource[], domains: DashboardDomain[], crimeCyberCount: number) {
  const commonSteps = ["Registry", "Probe", "Parser", "Evidence hash", "Lens fusion", "Policy gate", "Brief"];
  const parserBacklog = sources.filter((source) => source.updateMode !== "live_probe").length;
  const liveProbeReady = sources.filter((source) => source.updateMode === "live_probe").length;
  const reviewRequired = sources.filter((source) => source.endpoints.some((endpoint) => endpoint.requiresAuth) || source.updateMode === "manual_review_required").length;
  const models: Record<KpiKey, {
    title: string;
    question: string;
    explanation: string;
    heatTitle: string;
    steps: string[];
    metrics: Array<{ label: string; value: string | number }>;
    bars: Array<{ label: string; value: number }>;
    trend: number[];
  }> = {
    sources: {
      title: "Official source body",
      question: "Which registered official sources are visible after filters?",
      explanation: "This view counts repository-registered official/public sources only. It is not a government statistic or incident count.",
      heatTitle: "Visible source domains",
      steps: commonSteps,
      metrics: [{ label: "Sources", value: sources.length }, { label: "Domains", value: domains.length }, { label: "Review", value: reviewRequired }],
      bars: domains.slice(0, 8).map((item) => ({ label: labelize(item.domain), value: item.total })),
      trend: commonSteps.map((_, index) => 28 + index * 9),
    },
    years: {
      title: "2012-2026 target window",
      question: "What period should future crime/cyber importers cover?",
      explanation: "This is a target ingestion window only. It does not claim parsed year-wise NCRB/CERT-In rows are present.",
      heatTitle: "Target-year import plan",
      steps: ["2012", "2014", "2016", "2018", "2020", "2022", "2024", "2026"],
      metrics: [{ label: "Years", value: 15 }, { label: "Parsed", value: 0 }, { label: "Required", value: "NCRB/CERT-In" }],
      bars: ["2012-14", "2015-17", "2018-20", "2021-23", "2024-26"].map((label) => ({ label, value: 0 })),
      trend: [0, 0, 0, 0, 0, 0, 0, 0],
    },
    crime: {
      title: "Crime/cyber lanes",
      question: "Which official lanes support crime and cybercrime analysis?",
      explanation: "Only registered source lanes are shown here. Numeric crime/cyber claims remain blocked until official tables are parsed.",
      heatTitle: "Crime/cyber registered lanes",
      steps: ["NCRB", "I4C", "Cybercrime portal", "CERT-In", "PIB", "RBI", "Evidence"],
      metrics: [{ label: "Lanes", value: crimeCyberCount }, { label: "Verified", value: crimeCyberCount }, { label: "Parsed rows", value: 0 }],
      bars: groupDomains(sources.filter((source) => ["crime", "cybercrime", "cyber_incident", "consumer_finance_protection"].includes(source.domain))).map((item) => ({ label: labelize(item.domain), value: item.total })),
      trend: [0, 0, 0, 0, 0, 0, crimeCyberCount],
    },
    typologies: {
      title: "Typology evidence gate",
      question: "Which scam labels are allowed only as uncounted watch categories?",
      explanation: "These labels are not incident totals. They are analyst watch categories that require official source evidence before publication.",
      heatTitle: "Watch categories, not counts",
      steps: ["Identify", "Source", "Classify", "Map state", "Verify", "Escalate"],
      metrics: [{ label: "Typologies", value: 6 }, { label: "Source lanes", value: crimeCyberCount }, { label: "False claims", value: "blocked" }],
      bars: [
        { label: "Digital arrest", value: hasSource(sources, "cybercrime") ? 1 : 0 },
        { label: "Jamtara / Telegram fraud", value: hasSource(sources, "cybercrime") ? 1 : 0 },
        { label: "Chinese loan app", value: hasSource(sources, "consumer_finance_protection") ? 1 : 0 },
        { label: "Worm / malware", value: hasSource(sources, "cyber_incident") ? 1 : 0 },
        { label: "Investment scam", value: hasSource(sources, "cybercrime") ? 1 : 0 },
        { label: "Phishing / mule account", value: hasSource(sources, "cybercrime") ? 1 : 0 },
      ],
      trend: [0, 0, 0, 0, 0, crimeCyberCount],
    },
    parser: makeSimpleModel("Parser queue", "Which visible source families still need importers?", parserBacklog, domains.filter((item) => item.parserRequired > 0).slice(0, 8).map((item) => ({ label: labelize(item.domain), value: item.parserRequired }))),
    probe: makeSimpleModel("Probe readiness", "Which visible sources can be checked by live probe?", liveProbeReady, domains.filter((item) => item.total > 0).slice(0, 8).map((item) => ({ label: labelize(item.domain), value: item.total - item.parserRequired }))),
    review: makeSimpleModel("Review gates", "Which visible sources need auth/manual review before publication?", reviewRequired, domains.slice(0, 8).map((item) => ({ label: labelize(item.domain), value: item.parserRequired }))),
    policy: makeSimpleModel("Policy/evidence gates", "Which controls protect the dashboard from fake intelligence?", 6, ["Policy", "Evidence", "Redaction", "Source hash", "Human review", "No demo data"].map((label) => ({ label, value: 6 }))),
  };
  return models[active];
}

function makeSimpleModel(title: string, question: string, value: number, bars: Array<{ label: string; value: number }>) {
  const total = bars.reduce((sum, item) => sum + item.value, 0);
  return {
    title,
    question,
    explanation: "Click-driven drill-down recalculates the visible bars and readiness line from DISHA source metadata only.",
    heatTitle: `${title} by visible domain`,
    steps: ["Select KPI", "Apply filters", "Count sources", "Check readiness", "Review", "Export"],
    metrics: [{ label: "Selected", value }, { label: "Rows", value: bars.length }, { label: "Source total", value: total }],
    bars,
    trend: [0, 0, Math.max(0, total - value), value, value, value],
  };
}

function IndiaMap({ activeNames, features, coverage }: { activeNames: Set<string>; features: MapFeature[]; coverage: ReturnType<typeof getSourceMapCoverage> }) {
  if (!features.length) {
    return (
      <svg className={styles.indiaMap} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="img" aria-label="India live intelligence map">
        <path className={`${styles.mapDistrict} ${styles.mapActive}`} d="M348 55 C420 85 494 133 552 207 C619 292 650 388 618 486 C588 577 528 628 475 721 C436 782 363 801 311 748 C260 696 257 625 202 574 C146 522 108 457 125 382 C142 306 209 266 238 207 C265 151 288 84 348 55 Z" />
      </svg>
    );
  }
  return (
    <svg className={styles.indiaMap} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="img" aria-label="India live intelligence map">
      {features.map((feature) => {
        const active = activeNames.has(normalizeName(feature.stateName));
        return (
          <path
            key={feature.id}
            d={feature.path}
            className={`${styles.mapDistrict} ${active ? styles.mapActive : styles.mapMuted}`}
            style={{ "--heat-fill": active ? coverage.color : "#e2e8f0", "--heat-opacity": String(active ? coverage.opacity : 0.22) } as CSSProperties}
          >
            <title>{feature.stateName} - {feature.district}: {coverage.title}</title>
          </path>
        );
      })}
    </svg>
  );
}

function makeFlowNodes(domains: DashboardDomain[]): FlowNode[] {
  const values = domains.slice(0, 8);
  const base: FlowNode[] = [
    { id: "constitution", label: "Constitution", x: 380, y: 96, level: "central", value: 12 },
    { id: "gazette", label: "Gazette", x: 128, y: 132, level: "central", value: 10 },
    { id: "states", label: "States", x: 650, y: 148, level: "state", value: 11 },
    { id: "lgd", label: "LGD", x: 122, y: 720, level: "district", value: 10 },
    { id: "wris", label: "Rivers", x: 642, y: 728, level: "district", value: 10 },
  ];
  return [
    ...base,
    ...values.map((item, index) => ({
      id: item.domain,
      label: labelize(item.domain),
      x: 170 + (index % 4) * 140,
      y: 280 + Math.floor(index / 4) * 210,
      level: "source" as const,
      value: 7 + item.total,
    })),
  ];
}

function buildMapFeatures(geojson: GeoJson): MapFeature[] {
  return geojson.features.flatMap((feature, index) => {
    const stateName = feature.properties.st_nm ?? "India";
    const district = feature.properties.district ?? stateName;
    const path = geometryToPath(feature.geometry);
    if (!path) return [];
    return [{ id: `${stateName}-${district}-${index}`, stateName, district, path }];
  });
}

function groupDomains(sources: DashboardSource[]): DashboardDomain[] {
  return Array.from(new Set(sources.map((source) => source.domain))).map((sourceDomain) => {
    const domainSources = sources.filter((source) => source.domain === sourceDomain);
    return {
      domain: sourceDomain,
      total: domainSources.length,
      apiPull: domainSources.filter((source) => source.updateMode === "api_pull").length,
      parserRequired: domainSources.filter((source) => source.updateMode !== "live_probe").length,
      sourceIds: domainSources.map((source) => source.sourceId),
    };
  });
}

function hasSource(sources: DashboardSource[], domain: string): boolean {
  return sources.some((source) => source.domain === domain);
}

function getSourceMapCoverage(source?: DashboardSource) {
  if (!source) {
    return { label: "No source selected", color: "#e2e8f0", opacity: 0.5, title: "No source selected" };
  }
  const levels = new Set(source.geographyLevel);
  if (levels.has("district") || levels.has("local_body") || levels.has("point")) {
    return {
      label: "district/local eligible",
      color: "#2563eb",
      opacity: 0.82,
      title: `${source.sourceName}: registered for district/local geography. District incident rows are not imported.`,
    };
  }
  if (levels.has("state")) {
    return {
      label: "state eligible",
      color: "#0f766e",
      opacity: 0.76,
      title: `${source.sourceName}: registered for state geography. State-specific values are not imported.`,
    };
  }
  return {
    label: "national/union only",
    color: "#cbd5e1",
    opacity: 0.62,
    title: `${source.sourceName}: national/union source. No state or district data is claimed.`,
  };
}

function BarChart({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <svg className={styles.barChart} viewBox="0 0 420 220" role="img" aria-label="Bar chart">
      {rows.slice(0, 8).map((row, index) => {
        const y = 18 + index * 25;
        const width = Math.max((row.value / max) * 220, 12);
        return (
          <g key={row.label}>
            <text x="0" y={y + 13}>{row.label}</text>
            <rect x="170" y={y} width="230" height="16" rx="2" className={styles.chartTrack} />
            <rect x="170" y={y} width={width} height="16" rx="2" className={styles.chartBar} />
            <text x="410" y={y + 13} textAnchor="end">{row.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  let offset = 25;
  return (
    <svg className={styles.donutChart} viewBox="0 0 220 220" role="img" aria-label="Donut chart">
      <circle cx="92" cy="92" r="58" className={styles.donutBase} />
      {rows.map((row, index) => {
        const dash = (row.value / total) * 365;
        const node = <circle key={row.label} cx="92" cy="92" r="58" className={styles[`donutSlice${index}`]} strokeDasharray={`${dash} ${365 - dash}`} strokeDashoffset={-offset} />;
        offset += dash;
        return node;
      })}
      <text x="92" y="88" textAnchor="middle" className={styles.donutValue}>{total}</text>
      <text x="92" y="108" textAnchor="middle" className={styles.donutLabel}>total</text>
      {rows.slice(0, 5).map((row, index) => <text key={row.label} x="160" y={42 + index * 24}>{row.label}</text>)}
    </svg>
  );
}

function LineChart({ labels, values, hotIndex }: { labels: string[]; values: number[]; hotIndex: number }) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = 20 + (index * 330) / Math.max(values.length - 1, 1);
    const y = 132 - (value / max) * 96;
    return [x, y] as const;
  });
  return (
    <svg className={styles.lineChart} viewBox="0 0 380 170" role="img" aria-label="Line chart">
      {[0, 1, 2, 3].map((line) => <line key={line} x1="20" x2="350" y1={36 + line * 32} y2={36 + line * 32} />)}
      <polyline points={points.map(([x, y]) => `${x},${y}`).join(" ")} />
      {points.map(([x, y], index) => <circle key={labels[index] ?? index} cx={x} cy={y} r={index === hotIndex ? 6 : 4} data-hot={index === hotIndex} />)}
      {labels.map((label, index) => <text key={label} x={20 + (index * 330) / Math.max(labels.length - 1, 1)} y="158" textAnchor="middle">{label.length > 9 ? label.slice(0, 8) : label}</text>)}
    </svg>
  );
}

function geometryToPath(geometry: Geometry): string {
  if (geometry.type === "LineString") return lineToPath(geometry.coordinates as number[][]);
  if (geometry.type === "MultiLineString") return (geometry.coordinates as number[][][]).map(lineToPath).join(" ");
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][];
  return polygons.map((polygon) => polygon.map((ring) => lineToPath(ring) + " Z").join(" ")).join(" ");
}

function lineToPath(line: number[][]): string {
  return line.map(([lon, lat], index) => {
    const [x, y] = projectPoint(lon, lat);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

function projectPoint(lon: number, lat: number): [number, number] {
  const x = ((lon - INDIA_BOUNDS.minLon) / (INDIA_BOUNDS.maxLon - INDIA_BOUNDS.minLon)) * VIEWBOX.width;
  const y = ((INDIA_BOUNDS.maxLat - lat) / (INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat)) * VIEWBOX.height;
  return [x, y];
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
}

function labelize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
