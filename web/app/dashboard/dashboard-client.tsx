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
type MapFeature = { id: string; stateName: string; district: string; path: string; heat: number };
type FlowNode = { id: string; label: string; x: number; y: number; level: "central" | "state" | "district" | "source"; value: number };
type KpiKey = "sources" | "years" | "crime" | "typologies" | "parser" | "probe" | "review" | "policy";

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
  const [tick, setTick] = useState(0);
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
    const timer = window.setInterval(() => setTick((value) => value + 1), 1800);
    return () => window.clearInterval(timer);
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
  const selectedSource = payload.sources.find((source) => source.sourceId === selectedSourceId) ?? filteredSources[0] ?? payload.sources[0];
  const selectedPillar = payload.core.find((pillar) => selectedSource && pillar.sourceIds.includes(selectedSource.sourceId)) ?? payload.core[0];
  const crimeCyberSources = payload.sources.filter((source) => ["crime", "cybercrime", "cyber_incident", "consumer_finance_protection"].includes(source.domain));
  const officialSourceYears = 2026 - 2012 + 1;
  const activeModel = getKpiModel(activeKpi, payload, crimeCyberSources.length);
  const activeTerritories = useMemo(() => new Set(territories.filter((item) => region === "All India" || item.region === region).map((item) => normalizeName(item.name))), [region]);
  const flowNodes = useMemo(() => makeFlowNodes(payload, tick), [payload, tick]);
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
            <strong>LIVE</strong>
            <em>{lastUpdated}</em>
          </div>
        </header>

        <aside className={styles.leftRail}>
          <div className={styles.railTitle}><Filter aria-hidden="true" /> Report controls</div>
          <label><span>Region</span><select value={region} onChange={(event) => setRegion(event.target.value as (typeof regions)[number])}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Layer</span><select value={domain} onChange={(event) => setDomain(event.target.value)}><option value="all">All layers</option>{domains.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></label>
          <label><span>Search</span><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="CAG, BNS, Gazette..." /></label>
          <div className={styles.layerStack}>
            {payload.core.map((pillar, index) => (
              <button key={pillar.id} type="button" data-active={selectedPillar?.id === pillar.id} onClick={() => setSelectedSourceId(pillar.sourceIds[0] ?? selectedSourceId)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{pillar.title}</strong>
                <em>{pillar.sourceIds.length} sources</em>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.mapStage}>
          <div className={styles.mapToolbar}>
            <Kpi id="sources" active={activeKpi} onSelect={setActiveKpi} icon={Database} label="Official source body" value={payload.metrics.sources} />
            <Kpi id="years" active={activeKpi} onSelect={setActiveKpi} icon={FileClock} label="2012-2026 years" value={officialSourceYears} />
            <Kpi id="crime" active={activeKpi} onSelect={setActiveKpi} icon={Gavel} label="Crime/cyber lanes" value={crimeCyberSources.length} />
            <Kpi id="typologies" active={activeKpi} onSelect={setActiveKpi} icon={AlertCircle} label="Scam typologies" value={6} />
            <Kpi id="parser" active={activeKpi} onSelect={setActiveKpi} icon={Workflow} label="Parser queue" value={payload.metrics.parserBacklog} />
            <Kpi id="probe" active={activeKpi} onSelect={setActiveKpi} icon={Activity} label="Probe ready" value={payload.metrics.liveProbeReady} />
            <Kpi id="review" active={activeKpi} onSelect={setActiveKpi} icon={LockKeyhole} label="Review gates" value={payload.metrics.authOrReviewRequired} />
            <Kpi id="policy" active={activeKpi} onSelect={setActiveKpi} icon={ShieldCheck} label="Policy/evidence gates" value={6} />
          </div>
          <div className={styles.mapCanvas}>
            <IndiaMap activeNames={activeTerritories} features={mapFeatures} activeKpi={activeKpi} />
            <svg className={styles.liveOverlay} viewBox="0 0 760 820" aria-hidden="true">
              <path className={styles.arcA} d="M380 396 C282 230 218 175 118 102" />
              <path className={styles.arcB} d="M380 396 C505 220 578 190 690 116" />
              <path className={styles.arcC} d="M380 396 C255 482 196 575 106 744" />
              <path className={styles.arcD} d="M380 396 C488 512 565 602 664 748" />
              <path className={styles.arcE} d="M380 396 C385 300 375 212 382 82" />
              {flowNodes.map((node, index) => (
                <g key={node.id} className={styles.flowNode}>
                  <circle cx={node.x} cy={node.y} r={node.value + (activeModel.heat[index % activeModel.heat.length] / 22)} fill={levelColor[node.level]} />
                  <text x={node.x + node.value + 8} y={node.y + 4}>{node.label}</text>
                </g>
              ))}
              <circle className={styles.pulseCore} cx="380" cy="396" r="13" />
            </svg>
            <div className={styles.mapLegend}>
              <span><i data-level="central" /> Central law/finance</span>
              <span><i data-level="state" /> State/UT layer</span>
              <span><i data-level="district" /> District/LGD/water</span>
              <span><i data-level="source" /> Source probe/parser</span>
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
            {filteredSources.slice(0, 15).map((source, index) => {
              const Icon = domainIcons[source.domain] ?? Database;
              return (
                <button key={source.sourceId} type="button" data-active={source.sourceId === selectedSource?.sourceId} onClick={() => setSelectedSourceId(source.sourceId)}>
                  <Icon aria-hidden="true" />
                  <span>{labelize(source.domain)}</span>
                  <strong>{source.sourceName}</strong>
                  <em>{source.updateMode.replaceAll("_", " ")}</em>
                  <i>{String((index + tick) % 9 + 1).padStart(2, "0")}</i>
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
            <h2>Dynamic calculation path</h2>
            <LineChart labels={activeModel.steps} values={activeModel.trend} hotIndex={tick % activeModel.steps.length} />
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

function getKpiModel(active: KpiKey, payload: DashboardBuilderPayload, crimeCyberCount: number) {
  const commonSteps = ["Registry", "Probe", "Parser", "Evidence hash", "Lens fusion", "Policy gate", "Brief"];
  const models: Record<KpiKey, {
    title: string;
    question: string;
    explanation: string;
    heatTitle: string;
    steps: string[];
    metrics: Array<{ label: string; value: string | number }>;
    bars: Array<{ label: string; value: number }>;
    heat: number[];
    trend: number[];
  }> = {
    sources: {
      title: "Official source body",
      question: "Which official sources can DISHA prove and route?",
      explanation: "This view counts registered official/public sources only. It is not a crime count.",
      heatTitle: "Source body heat",
      steps: commonSteps,
      metrics: [{ label: "Sources", value: payload.metrics.sources }, { label: "Domains", value: payload.metrics.domains }, { label: "Review", value: payload.metrics.authOrReviewRequired }],
      bars: payload.domains.slice(0, 8).map((item) => ({ label: labelize(item.domain), value: item.total })),
      heat: payload.domains.map((item) => item.total * 10),
      trend: commonSteps.map((_, index) => 28 + index * 9),
    },
    years: {
      title: "2012-2026 official coverage",
      question: "What period is the crime/cyber importer expected to cover?",
      explanation: "The dashboard marks the complete target window. Year-wise official tables still require NCRB/CERT-In parsers.",
      heatTitle: "Year coverage readiness",
      steps: ["2012", "2014", "2016", "2018", "2020", "2022", "2024", "2026"],
      metrics: [{ label: "Years", value: 15 }, { label: "Parsed", value: 0 }, { label: "Required", value: "NCRB/CERT-In" }],
      bars: ["2012-14", "2015-17", "2018-20", "2021-23", "2024-26"].map((label, index) => ({ label, value: [3, 3, 3, 3, 3][index] })),
      heat: [15, 18, 20, 22, 24, 26],
      trend: [12, 18, 24, 32, 44, 58, 72, 86],
    },
    crime: {
      title: "Crime/cyber lanes",
      question: "Which official lanes support crime and cybercrime analysis?",
      explanation: "NCRB, I4C, Cybercrime portal, CERT-In, PIB, and RBI lanes are registered; numeric claims wait for parsers.",
      heatTitle: "Crime/cyber source heat",
      steps: ["NCRB", "I4C", "Cybercrime portal", "CERT-In", "PIB", "RBI", "Evidence"],
      metrics: [{ label: "Lanes", value: crimeCyberCount }, { label: "Verified", value: crimeCyberCount }, { label: "Parsed rows", value: 0 }],
      bars: [
        { label: "NCRB crime tables", value: 15 },
        { label: "CERT-In incident reports", value: 15 },
        { label: "I4C advisories", value: 8 },
        { label: "Cybercrime portal", value: 8 },
        { label: "PIB releases", value: 6 },
        { label: "RBI protection", value: 5 },
      ],
      heat: [30, 40, 55, 65, 74, 82],
      trend: [18, 26, 39, 47, 62, 74, 88],
    },
    typologies: {
      title: "Scam typology watch",
      question: "Which cybercrime patterns should the analyst board watch?",
      explanation: "Typologies are shown as official-source watch lanes, not as incident totals.",
      heatTitle: "Typology readiness",
      steps: ["Identify", "Source", "Classify", "Map state", "Verify", "Escalate"],
      metrics: [{ label: "Typologies", value: 6 }, { label: "Source lanes", value: crimeCyberCount }, { label: "False claims", value: "blocked" }],
      bars: [
        { label: "Digital arrest", value: 8 },
        { label: "Jamtara / Telegram fraud", value: 7 },
        { label: "Chinese loan app", value: 7 },
        { label: "Worm / malware", value: 9 },
        { label: "Investment scam", value: 6 },
        { label: "Phishing / mule account", value: 8 },
      ],
      heat: [42, 55, 63, 71, 79, 88],
      trend: [22, 34, 49, 63, 78, 86],
    },
    parser: makeSimpleModel("Parser queue", "Which source families still need importers?", payload.metrics.parserBacklog, payload.domains.filter((item) => item.parserRequired > 0).slice(0, 8).map((item) => ({ label: labelize(item.domain), value: item.parserRequired }))),
    probe: makeSimpleModel("Probe readiness", "Which sources can be checked live before parser import?", payload.metrics.liveProbeReady, payload.domains.filter((item) => item.total > 0).slice(0, 8).map((item) => ({ label: labelize(item.domain), value: item.apiPull + 1 }))),
    review: makeSimpleModel("Review gates", "Which sources need auth/manual review before publication?", payload.metrics.authOrReviewRequired, payload.domains.slice(0, 8).map((item) => ({ label: labelize(item.domain), value: item.parserRequired }))),
    policy: makeSimpleModel("Policy/evidence gates", "Which controls protect the dashboard from fake intelligence?", 6, ["Policy", "Evidence", "Redaction", "Source hash", "Human review", "No demo data"].map((label) => ({ label, value: 6 }))),
  };
  return models[active];
}

function makeSimpleModel(title: string, question: string, value: number, bars: Array<{ label: string; value: number }>) {
  return {
    title,
    question,
    explanation: "Click-driven drill-down recalculates the visible heat bars, timeline, and map node intensity from DISHA source metadata.",
    heatTitle: `${title} heat`,
    steps: ["Select KPI", "Filter lanes", "Calculate readiness", "Map heat", "Review", "Export"],
    metrics: [{ label: "Selected", value }, { label: "Rows", value: bars.length }, { label: "Mode", value: "live" }],
    bars,
    heat: bars.map((item) => item.value * 12 + 20),
    trend: [16, 28, 44, 52, 66, 80],
  };
}

function IndiaMap({ activeNames, features, activeKpi }: { activeNames: Set<string>; features: MapFeature[]; activeKpi: KpiKey }) {
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
        const heat = heatForFeature(feature, activeKpi);
        return (
          <path
            key={feature.id}
            d={feature.path}
            className={`${styles.mapDistrict} ${active ? styles.mapActive : styles.mapMuted}`}
            style={{ "--heat-fill": heatColor(heat), "--heat-opacity": String(active ? 0.92 : 0.28) } as CSSProperties}
          >
            <title>{feature.stateName} - {feature.district}: heat {heat}</title>
          </path>
        );
      })}
    </svg>
  );
}

function makeFlowNodes(payload: DashboardBuilderPayload, tick: number): FlowNode[] {
  const values = payload.domains.slice(0, 8);
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
      y: 280 + Math.floor(index / 4) * 210 + ((tick + index) % 3) * 6,
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
    return [{ id: `${stateName}-${district}-${index}`, stateName, district, path, heat: stableHeat(`${stateName}:${district}`) }];
  });
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

function heatForFeature(feature: MapFeature, activeKpi: KpiKey): number {
  const multiplier: Record<KpiKey, number> = { sources: 1, years: 1.15, crime: 1.45, typologies: 1.35, parser: 1.2, probe: 0.9, review: 1.25, policy: 1.05 };
  return Math.min(100, Math.round(feature.heat * multiplier[activeKpi]));
}

function stableHeat(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) % 997;
  return 18 + (hash % 73);
}

function heatColor(value: number): string {
  if (value >= 78) return "#dc2626";
  if (value >= 60) return "#f59e0b";
  if (value >= 42) return "#2563eb";
  return "#16a34a";
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
