"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  CircleDot,
  Database,
  FileSearch,
  Filter,
  Gavel,
  Landmark,
  MapPinned,
  RefreshCw,
  Rows3,
  Search,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { regions, territories, type Region } from "@/lib/india-dashboard-data";
import type { DashboardBuilderPayload } from "@/lib/dashboard-builder-feed";

import styles from "./dashboard.module.css";

type SourceDefinition = {
  sourceId: string;
  sourceName: string;
  owner: string;
  domain: string;
  sourceType: string;
  url: string;
  license: string;
  geographyLevel: string[];
  updateMode: string;
  endpoints: Array<{ url: string; requiresAuth: boolean; purpose: string }>;
  knownLimitations: string[];
};

type CorePillar = {
  id: string;
  title: string;
  role: string;
  sourceDomains: string[];
  requiredBeforeFactUse: string[];
  sourceIds: string[];
};

type BuilderPayload = DashboardBuilderPayload;
type ClientProps = {
  initialPayload: BuilderPayload;
};

type LegacyBuilderPayload = {
  generatedAt: string;
  notice: string;
  sources: SourceDefinition[];
  core: CorePillar[];
  domains: Array<{ domain: string; total: number; parserRequired: number; apiPull: number; sourceIds: string[] }>;
  metrics: {
    sources: number;
    pillars: number;
    domains: number;
    parserBacklog: number;
    liveProbeReady: number;
    authOrReviewRequired: number;
  };
};

type Geometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

type GeoFeature = {
  properties: { st_nm: string; district?: string };
  geometry: Geometry;
};

type GeoJson = {
  features: GeoFeature[];
};

type MapFeature = {
  id: string;
  stateName: string;
  district: string;
  path: string;
};

const INDIA_BOUNDS = { minLon: 67, maxLon: 98.5, minLat: 5.5, maxLat: 37.5 };
const VIEWBOX = { width: 760, height: 820 };

const emptyPayload: LegacyBuilderPayload = {
  generatedAt: new Date().toISOString(),
  notice: "Loading official source body.",
  sources: [],
  core: [],
  domains: [],
  metrics: {
    sources: 0,
    pillars: 0,
    domains: 0,
    parserBacklog: 0,
    liveProbeReady: 0,
    authOrReviewRequired: 0,
  },
};

const domainIcons: Record<string, LucideIcon> = {
  constitution: Landmark,
  law_code: Gavel,
  gazette: FileSearch,
  parliament: Building2,
  institutional_directory: Rows3,
  state_government: MapPinned,
  audit: ShieldCheck,
  finance: Database,
  tax: Database,
  administrative_directory: Rows3,
  open_data: Database,
  geospatial: MapPinned,
  water: CircleDot,
  disaster: ShieldCheck,
  crime: Gavel,
  macro_economy: Database,
  api_directory: Workflow,
};

export default function DashboardClient({ initialPayload }: ClientProps) {
  const [payload, setPayload] = useState<BuilderPayload>(initialPayload);
  const [selectedRegion, setSelectedRegion] = useState<(typeof regions)[number]>("All India");
  const [selectedPillarId, setSelectedPillarId] = useState("public-finance-audit");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedTerritory, setSelectedTerritory] = useState("India");
  const [query, setQuery] = useState("");
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
    async function loadBuilder() {
      setRefreshing(true);
      try {
        const response = await fetch("/api/dashboard/builder", { cache: "no-store" });
        const next = (await response.json()) as BuilderPayload;
        if (alive) {
          setPayload(next);
          setSelectedPillarId((current) => next.core.some((pillar) => pillar.id === current) ? current : next.core[0]?.id ?? current);
        }
      } finally {
        if (alive) setRefreshing(false);
      }
    }
    loadBuilder();
    const interval = window.setInterval(loadBuilder, 30000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);

  const selectedPillar = payload.core.find((pillar) => pillar.id === selectedPillarId) ?? payload.core[0];
  const pillarSources = useMemo(() => {
    if (!selectedPillar) return [];
    const sourceSet = new Set(selectedPillar.sourceIds);
    return payload.sources.filter((source) => sourceSet.has(source.sourceId));
  }, [payload.sources, selectedPillar]);

  const filteredSources = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return payload.sources.filter((source) => {
      const domainMatch = selectedDomain === "all" || source.domain === selectedDomain;
      const queryMatch = !normalized || [source.sourceName, source.owner, source.domain, source.sourceId].some((value) => value.toLowerCase().includes(normalized));
      return domainMatch && queryMatch;
    });
  }, [payload.sources, query, selectedDomain]);

  const regionTerritories = useMemo(() => {
    return territories.filter((territory) => selectedRegion === "All India" || territory.region === selectedRegion);
  }, [selectedRegion]);

  const domains = payload.domains.map((item) => item.domain);
  const lastUpdated = new Date(payload.generatedAt).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "short",
  });

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="dashboard-title">
        <nav className={styles.reportTabs} aria-label="Builder pages">
          <button type="button" className={styles.activeTab}>Constitutional Builder</button>
          <button type="button">Source Body</button>
          <button type="button">Parser Workbench</button>
          <button type="button">Evidence Chain</button>
        </nav>

        <header className={styles.commandHeader}>
          <div>
            <p className={styles.eyebrow}>DISHA Agentic Map Architecture</p>
            <h1 id="dashboard-title">DISHA 6.6 : Intelligence Architecture System</h1>
            <p className={styles.deck}>India constitutional evidence builder</p>
            <p className={styles.subtitle}>{payload.notice}</p>
          </div>
          <div className={styles.scanStatus}>
            <RefreshCw aria-hidden="true" className={refreshing ? styles.spin : ""} />
            <span>Source spine refreshed</span>
            <strong>{lastUpdated}</strong>
          </div>
        </header>

        <section className={styles.filterBar} aria-label="Builder controls">
          <div className={styles.filterTitle}><Filter aria-hidden="true" /><span>Builder</span></div>
          <label className={styles.selectControl}>
            <span>Region</span>
            <select value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value as (typeof regions)[number])}>
              {regions.map((region) => <option key={region}>{region}</option>)}
            </select>
          </label>
          <label className={styles.selectControl}>
            <span>Domain</span>
            <select value={selectedDomain} onChange={(event) => setSelectedDomain(event.target.value)}>
              <option value="all">All source domains</option>
              {domains.map((domain) => <option key={domain} value={domain}>{labelize(domain)}</option>)}
            </select>
          </label>
          <label className={styles.selectControl}>
            <span>Pillar</span>
            <select value={selectedPillarId} onChange={(event) => setSelectedPillarId(event.target.value)}>
              {payload.core.map((pillar) => <option key={pillar.id} value={pillar.id}>{pillar.title}</option>)}
            </select>
          </label>
          <label className={styles.searchControl}>
            <span>Search sources</span>
            <Search aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Constitution, CAG, BNS, Gazette, WRIS..." />
          </label>
        </section>

        <section className={styles.measureGrid} aria-label="Source metrics">
          <Metric icon={Database} label="Official sources" value={payload.metrics.sources} note="Registered source systems" />
          <Metric icon={BookOpen} label="Core pillars" value={payload.metrics.pillars} note="Proof-bound reasoning body" />
          <Metric icon={Workflow} label="Parser backlog" value={payload.metrics.parserBacklog} note="Needs importer before fact use" />
          <Metric icon={CheckCircle2} label="Live probe ready" value={payload.metrics.liveProbeReady} note="Can be checked without parser" />
        </section>

        <section className={styles.builderGrid}>
          <article className={styles.mapPanel}>
            <PanelHeader icon={MapPinned} eyebrow="India map" title="State and UT builder canvas" />
            <div className={styles.mapShell}>
              <IndiaMap
                activeNames={new Set(regionTerritories.map((territory) => normalizeName(territory.name)))}
                features={mapFeatures}
                selectedName={selectedTerritory}
                onSelect={setSelectedTerritory}
              />
              <svg className={styles.flowLayer} viewBox="0 0 760 820" aria-hidden="true">
                <path d="M380 410 C300 300 260 220 190 160" />
                <path d="M380 410 C465 290 515 230 605 160" />
                <path d="M380 410 C290 465 230 545 160 690" />
                <path d="M380 410 C470 500 540 585 610 705" />
                <circle cx="380" cy="410" r="9" />
              </svg>
              <div className={styles.mapBadges} aria-label="Map flow layers">
                <span>Union source spine</span>
                <span>State and UT directory</span>
                <span>District/LGD layer</span>
                <span>Parser readiness heat</span>
              </div>
            </div>
            <div className={styles.mapFooter}>
              <strong>{selectedTerritory}</strong>
              <span>{selectedRegion === "All India" ? "All states and union territories" : `${selectedRegion} region`}</span>
              <em>No incident data is invented; geography is used as a builder layer until official datasets are imported.</em>
            </div>
          </article>

          <aside className={styles.builderPanel}>
            <PanelHeader icon={Landmark} eyebrow="Core body" title={selectedPillar?.title ?? "Loading"} />
            <p className={styles.bodyText}>{selectedPillar?.role ?? "Loading constitutional core."}</p>
            <div className={styles.proofList}>
              {(selectedPillar?.requiredBeforeFactUse ?? []).map((item) => (
                <div key={item}><CheckCircle2 aria-hidden="true" /><span>{item}</span></div>
              ))}
            </div>
            <div className={styles.sourceChips}>
              {pillarSources.map((source) => (
                <a key={source.sourceId} href={source.url} target="_blank" rel="noreferrer">{source.sourceName}</a>
              ))}
            </div>
          </aside>
        </section>

        <section className={styles.analyticsGrid}>
          <article className={styles.panel}>
            <PanelHeader icon={Rows3} eyebrow="Domains" title="Source coverage by body" />
            <div className={styles.barList}>
              {payload.domains.map((domain) => (
                <div className={styles.barRow} key={domain.domain}>
                  <span>{labelize(domain.domain)}</span>
                  <strong>{domain.total}</strong>
                  <div><i style={{ width: `${Math.max((domain.total / Math.max(payload.metrics.sources, 1)) * 100, 5)}%` }} /></div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <PanelHeader icon={Workflow} eyebrow="Agent graph" title="Builder execution path" />
            <div className={styles.agentPath}>
              {["Source registry", "Live probe", "Parser", "Evidence hash", "Lens", "Policy", "Model advice", "Human review"].map((step, index) => (
                <div key={step} data-active={index < 2 ? "true" : "false"}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step}</strong>
                </div>
              ))}
            </div>
            <div className={styles.flowRail}>
              <div><span>Central</span><strong>Constitution, Gazette, Parliament, Union Budget</strong></div>
              <div><span>State</span><strong>State/UT portals, departments, CAG state finance</strong></div>
              <div><span>District</span><strong>LGD, local bodies, water and disaster layers</strong></div>
              <div><span>Action</span><strong>Evidence hash, policy gate, human review</strong></div>
            </div>
          </article>

          <article className={styles.panel}>
            <PanelHeader icon={FileSearch} eyebrow="Source table" title="Official/public registry" />
            <div className={styles.sourceTable}>
              {filteredSources.slice(0, 14).map((source) => {
                const Icon = domainIcons[source.domain] ?? Database;
                return (
                  <a key={source.sourceId} href={source.url} target="_blank" rel="noreferrer">
                    <Icon aria-hidden="true" />
                    <span>{source.sourceName}</span>
                    <strong>{labelize(source.domain)}</strong>
                    <em>{source.updateMode.replaceAll("_", " ")}</em>
                  </a>
                );
              })}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: number; note: string }) {
  return (
    <article className={styles.measureVisual}>
      <div className={styles.metricHead}>
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </div>
      <strong className={styles.metricValue}>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function PanelHeader({ icon: Icon, eyebrow, title }: { icon: LucideIcon; eyebrow: string; title: string }) {
  return (
    <div className={styles.panelHeader}>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <Icon aria-hidden="true" />
    </div>
  );
}

function IndiaMap({
  activeNames,
  features,
  selectedName,
  onSelect,
}: {
  activeNames: Set<string>;
  features: MapFeature[];
  selectedName: string;
  onSelect: (name: string) => void;
}) {
  if (!features.length) {
    return (
      <svg className={styles.indiaMap} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="img" aria-label="India states and union territories builder map">
        <path
          className={`${styles.mapDistrict} ${styles.mapActive}`}
          d="M348 55 C420 85 494 133 552 207 C619 292 650 388 618 486 C588 577 528 628 475 721 C436 782 363 801 311 748 C260 696 257 625 202 574 C146 522 108 457 125 382 C142 306 209 266 238 207 C265 151 288 84 348 55 Z"
        />
        {[
          [375, 120, "North"],
          [500, 260, "East"],
          [440, 610, "South"],
          [225, 420, "West"],
          [345, 390, "Central"],
          [580, 330, "North East"],
        ].map(([x, y, label]) => (
          <g key={label}>
            <circle className={styles.mapNode} cx={x} cy={y} r="10" />
            <text className={styles.mapLabel} x={Number(x) + 15} y={Number(y) + 4}>{label}</text>
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg className={styles.indiaMap} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="img" aria-label="India states and union territories builder map">
      {features.map((feature) => {
        const active = activeNames.has(normalizeName(feature.stateName));
        const selected = feature.stateName === selectedName;
        return (
          <path
            key={feature.id}
            d={feature.path}
            className={`${styles.mapDistrict} ${active ? styles.mapActive : styles.mapMuted} ${selected ? styles.mapSelected : ""}`}
            onClick={() => onSelect(feature.stateName)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(feature.stateName);
            }}
            role="button"
            tabIndex={0}
          >
            <title>{feature.stateName} - {feature.district}</title>
          </path>
        );
      })}
    </svg>
  );
}

function buildMapFeatures(geojson: GeoJson): MapFeature[] {
  return geojson.features.flatMap((feature, index) => {
    const stateName = feature.properties.st_nm;
    const district = feature.properties.district ?? stateName;
    const path = geometryToPath(feature.geometry);
    if (!path) return [];
    return [{ id: `${stateName}-${district}-${index}`, stateName, district, path }];
  });
}

function geometryToPath(geometry: Geometry): string {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][];
  return polygons
    .map((polygon) =>
      polygon
        .map((ring) =>
          ring
            .map(([lon, lat], index) => {
              const [x, y] = projectPoint(lon, lat);
              return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(" ") + " Z",
        )
        .join(" "),
    )
    .join(" ");
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
