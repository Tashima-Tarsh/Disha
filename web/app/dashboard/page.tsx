"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ClipboardList,
  FileSearch,
  Filter,
  Gavel,
  Landmark,
  MapPinned,
  Radar,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

import {
  domains,
  priorities,
  regions,
  territories,
  type Domain,
  type Priority,
  type Region,
} from "@/lib/india-dashboard-data";

import styles from "./dashboard.module.css";

type SortKey = "cases" | "evidence" | "approval";

type ScanTerritory = {
  name: string;
  aliases?: string[];
  kind: string;
  region: Region;
  domain: Domain;
  priority: Priority;
  cases: number;
  evidence: number;
  approval: number;
  closure: number;
  note: string;
  agenticScan: {
    posture: string;
    nextAction: string;
    confidenceBand: string;
  };
};

type ScanPayload = {
  generatedAt: string;
  scanId: string;
  sourceNotice: string;
  scan: ScanTerritory[];
};

type NationalSourceStatus =
  | "connected"
  | "registry_ready"
  | "requires_api_key"
  | "requires_bulk_import"
  | "verify_required";

type NationalSource = {
  id: string;
  layer: string;
  scope: string;
  authority: string;
  status: NationalSourceStatus;
  dashboardUse: string;
};

type NationalPayload = {
  coverage: {
    total: number;
    verifiedLiveSources: number;
    verificationGaps: number;
    counts: Record<NationalSourceStatus, number>;
  };
  sources: NationalSource[];
};

type ConnectorPayload = {
  connectors: Array<{
    id: string;
    label: string;
    layer: string;
    authority: string;
    cadence: string;
    needsApiKey: boolean;
    needsBulkImport: boolean;
    updateDetection: string;
  }>;
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

const INDIA_BOUNDS = {
  minLon: 67,
  maxLon: 98.5,
  minLat: 5.5,
  maxLat: 37.5,
};

const VIEWBOX = {
  width: 760,
  height: 820,
};

const domainMeta: Record<Domain, { icon: LucideIcon; label: string; color: string }> = {
  Constitutional: { icon: Landmark, label: "Constitutional audit", color: "#d8a235" },
  Service: { icon: ClipboardList, label: "Service-gap protection", color: "#7aaa5d" },
  Resilience: { icon: Route, label: "Infrastructure resilience", color: "#d87855" },
  Evidence: { icon: FileSearch, label: "Evidence verification", color: "#5aa6a0" },
};

const fallbackPayload: ScanPayload = {
  generatedAt: new Date().toISOString(),
  scanId: "DISHA-IN-LOCAL",
  sourceNotice: "Demo operational feed for product evaluation. Not a government statistic.",
  scan: territories.map((territory) => ({
    ...territory,
    closure: 62,
    agenticScan: {
      posture: "Routine scan",
      nextAction: "Evidence bundle",
      confidenceBand: "Review",
    },
  })),
};

const fallbackNationalPayload: NationalPayload = {
  coverage: {
    total: 0,
    verifiedLiveSources: 0,
    verificationGaps: 0,
    counts: {
      connected: 0,
      registry_ready: 0,
      requires_api_key: 0,
      requires_bulk_import: 0,
      verify_required: 0,
    },
  },
  sources: [],
};

const fallbackConnectorPayload: ConnectorPayload = {
  connectors: [],
};

export default function DashboardPage() {
  const [selectedRegion, setSelectedRegion] = useState<(typeof regions)[number]>("All India");
  const [selectedDomain, setSelectedDomain] = useState<(typeof domains)[number]>("All domains");
  const [selectedPriority, setSelectedPriority] = useState<(typeof priorities)[number]>("All priorities");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cases");
  const [selectedTerritory, setSelectedTerritory] = useState("Uttar Pradesh");
  const [payload, setPayload] = useState<ScanPayload>(fallbackPayload);
  const [nationalPayload, setNationalPayload] = useState<NationalPayload>(fallbackNationalPayload);
  const [connectorPayload, setConnectorPayload] = useState<ConnectorPayload>(fallbackConnectorPayload);
  const [mapFeatures, setMapFeatures] = useState<MapFeature[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let alive = true;

    async function loadMap() {
      const response = await fetch("/data/india-districts.geojson");
      const geojson = (await response.json()) as GeoJson;
      if (!alive) return;
      setMapFeatures(buildMapFeatures(geojson));
    }

    loadMap().catch(() => setMapFeatures([]));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function refreshScan() {
      setIsRefreshing(true);
      try {
        const response = await fetch("/api/dashboard/india", { cache: "no-store" });
        const nextPayload = (await response.json()) as ScanPayload;
        if (alive) setPayload(nextPayload);
      } finally {
        if (alive) setIsRefreshing(false);
      }
    }

    refreshScan();
    const interval = window.setInterval(refreshScan, 12000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [refreshNonce]);

  useEffect(() => {
    let alive = true;

    async function loadConnectors() {
      const response = await fetch("/api/dashboard/connectors", { cache: "no-store" });
      const connectorManifest = (await response.json()) as ConnectorPayload;
      if (alive) setConnectorPayload(connectorManifest);
    }

    loadConnectors().catch(() => setConnectorPayload(fallbackConnectorPayload));
    return () => {
      alive = false;
    };
  }, [refreshNonce]);

  useEffect(() => {
    let alive = true;

    async function loadNationalRegistry() {
      const response = await fetch("/api/dashboard/national", { cache: "no-store" });
      const registry = (await response.json()) as NationalPayload;
      if (alive) setNationalPayload(registry);
    }

    loadNationalRegistry().catch(() => setNationalPayload(fallbackNationalPayload));
    return () => {
      alive = false;
    };
  }, [refreshNonce]);

  const scanByName = useMemo(
    () => new Map(payload.scan.map((item) => [normalizeName(item.name), item])),
    [payload.scan],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payload.scan
      .filter((territory) => {
        const regionMatch = selectedRegion === "All India" || territory.region === selectedRegion;
        const domainMatch = selectedDomain === "All domains" || territory.domain === selectedDomain;
        const priorityMatch = selectedPriority === "All priorities" || territory.priority === selectedPriority;
        const searchMatch =
          !query ||
          territory.name.toLowerCase().includes(query) ||
          territory.note.toLowerCase().includes(query) ||
          territory.region.toLowerCase().includes(query);
        return regionMatch && domainMatch && priorityMatch && searchMatch;
      })
      .sort((a, b) => getSortValue(b, sortKey) - getSortValue(a, sortKey));
  }, [payload.scan, search, selectedDomain, selectedPriority, selectedRegion, sortKey]);

  const selected =
    payload.scan.find((territory) => territory.name === selectedTerritory) ??
    filtered[0] ??
    payload.scan[0];
  const activeSet = useMemo(
    () => new Set(filtered.map((territory) => normalizeName(territory.name))),
    [filtered],
  );
  const approvalQueue = filtered.reduce((sum, territory) => sum + territory.approval, 0);
  const averageEvidence = Math.round(filtered.reduce((sum, territory) => sum + territory.evidence, 0) / Math.max(filtered.length, 1));
  const averageClosure = Math.round(filtered.reduce((sum, territory) => sum + territory.closure, 0) / Math.max(filtered.length, 1));
  const criticalCount = filtered.filter((territory) => territory.priority === "Critical").length;
  const regionRows = summarizeByRegion(filtered);
  const domainRows = summarizeByDomain(filtered);
  const priorityRows = summarizeByPriority(filtered);
  const lastUpdated = new Date(payload.generatedAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="dashboard-title">
        <header className={styles.commandHeader}>
          <div>
            <p className={styles.eyebrow}>DISHA National Intelligence Report</p>
            <h1 id="dashboard-title">India public accountability dashboard</h1>
          </div>
          <div className={styles.scanStatus}>
            <Radar aria-hidden="true" />
            <span>Dataset refresh</span>
            <strong>{lastUpdated}</strong>
            <button type="button" onClick={() => setRefreshNonce((value) => value + 1)}>
              {isRefreshing ? "Scanning" : "Refresh"}
            </button>
          </div>
        </header>

        <section className={styles.filterBar} aria-label="Dashboard slicers">
          <div className={styles.filterTitle}>
            <Filter aria-hidden="true" />
            <span>Report slicers</span>
          </div>
          <SelectControl label="Region" value={selectedRegion} values={regions} onChange={setSelectedRegion} />
          <SelectControl label="Domain" value={selectedDomain} values={domains} onChange={setSelectedDomain} />
          <SelectControl label="Priority" value={selectedPriority} values={priorities} onChange={setSelectedPriority} />
          <label className={styles.searchControl}>
            <span>Search</span>
            <Search aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="State, UT, region, evidence note" />
          </label>
        </section>

        <section className={styles.measureGrid} aria-label="Live BI visuals">
          <article className={styles.measureVisual}>
            <PanelHeader icon={AlertTriangle} eyebrow="Heat matrix" title="Priority by active units" />
            <div className={styles.heatMatrix}>
              {priorityRows.map((row) => (
                <div key={row.label} data-priority={row.label}>
                  <span>{row.label}</span>
                  <i style={{ width: `${Math.max((row.value / Math.max(filtered.length, 1)) * 100, 8)}%` }} />
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          </article>
          <article className={styles.measureVisual}>
            <PanelHeader icon={Gavel} eyebrow="Approval lane" title="Actions waiting for human review" />
            <div className={styles.flowVisual}>
              <span style={{ width: `${Math.min(approvalQueue * 3, 100)}%` }} />
              <p>{approvalQueue} approval-gated actions across the current filter.</p>
            </div>
          </article>
          <article className={styles.measureVisual}>
            <PanelHeader icon={ShieldCheck} eyebrow="Evidence lane" title="Verification and closure state" />
            <div className={styles.dualGauge}>
              <div><span style={{ height: `${averageEvidence}%` }} /><p>Evidence</p></div>
              <div><span style={{ height: `${averageClosure}%` }} /><p>Closure</p></div>
              <div><span style={{ height: `${Math.min(criticalCount * 18, 100)}%` }} /><p>Critical</p></div>
            </div>
          </article>
          <article className={styles.measureVisual}>
            <PanelHeader icon={ClipboardList} eyebrow="Live queue" title="Top changing territories" />
            <div className={styles.eventRail}>
              {filtered.slice(0, 5).map((territory) => (
                <button type="button" key={territory.name} onClick={() => setSelectedTerritory(territory.name)}>
                  <span>{territory.name}</span>
                  <i>{territory.agenticScan.nextAction}</i>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className={styles.operationsGrid}>
          <article className={styles.mapPanel}>
            <PanelHeader icon={MapPinned} eyebrow="Map visual" title="State and UT heat map" />
            <div className={styles.scanCanvas}>
              <IndiaMap
                activeSet={activeSet}
                features={mapFeatures}
                scanByName={scanByName}
                selectedName={selected.name}
                onSelect={setSelectedTerritory}
              />
            </div>
          </article>

          <aside className={styles.drillPanel}>
            <PanelHeader icon={FileSearch} eyebrow="Drill-through visual" title={selected.name} />
            <div className={styles.scoreRing} style={{ "--score": `${selected.evidence * 3.6}deg` } as CSSProperties}>
              <strong>{selected.evidence}%</strong>
              <span>evidence</span>
            </div>
            <div className={styles.detailList}>
              <Detail label="Posture" value={selected.agenticScan.posture} />
              <Detail label="Next action" value={selected.agenticScan.nextAction} />
              <Detail label="Confidence" value={selected.agenticScan.confidenceBand} />
              <Detail label="Domain" value={domainMeta[selected.domain].label} />
              <Detail label="Cases" value={String(selected.cases)} />
              <Detail label="Approval" value={String(selected.approval)} />
              <Detail label="Closure" value={`${selected.closure}%`} />
            </div>
          </aside>
        </section>

        <section className={styles.analyticsGrid}>
          <ChartPanel icon={Landmark} eyebrow="Zone workload" title="Cases by region" rows={regionRows} />
          <DomainPanel rows={domainRows} />
          <article className={styles.panel}>
            <PanelHeader icon={ClipboardList} eyebrow="Scan table" title="Territory queue" />
            <div className={styles.sortRow}>
              <button type="button" className={sortKey === "cases" ? styles.activeTool : ""} onClick={() => setSortKey("cases")}>Cases</button>
              <button type="button" className={sortKey === "evidence" ? styles.activeTool : ""} onClick={() => setSortKey("evidence")}>Evidence</button>
              <button type="button" className={sortKey === "approval" ? styles.activeTool : ""} onClick={() => setSortKey("approval")}>Approval</button>
            </div>
            <div className={styles.scanTable}>
              {filtered.slice(0, 12).map((territory) => (
                <button type="button" key={territory.name} onClick={() => setSelectedTerritory(territory.name)}>
                  <span>{territory.name}</span>
                  <strong>{territory.cases}</strong>
                  <small>{territory.agenticScan.nextAction}</small>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className={styles.sourceGrid} aria-label="National data source coverage">
          <article className={styles.panel}>
            <PanelHeader icon={ShieldCheck} eyebrow="National source registry" title="President to panchayat data coverage" />
            <div className={styles.sourceList}>
              {nationalPayload.sources.slice(0, 10).map((source) => (
                <div key={source.id}>
                  <span>{source.layer}</span>
                  <strong>{source.authority}</strong>
                  <small>{source.status.replaceAll("_", " ")}</small>
                  <p>{source.dashboardUse}</p>
                </div>
              ))}
            </div>
          </article>
          <article className={styles.panel}>
            <PanelHeader icon={RefreshCw} eyebrow="Connector mesh" title="Auto-update source connectors" />
            <div className={styles.connectorList}>
              {connectorPayload.connectors.slice(0, 12).map((connector) => (
                <div key={connector.id}>
                  <span>{connector.layer}</span>
                  <strong>{connector.label}</strong>
                  <small>{connector.cadence}</small>
                  <p>{connector.updateDetection}</p>
                  <em>
                    {connector.needsApiKey ? "API key required" : "No API key"}
                    {" · "}
                    {connector.needsBulkImport ? "Bulk import" : "Index/probe"}
                  </em>
                </div>
              ))}
            </div>
          </article>
        </section>

        <p className={styles.notice}>{payload.sourceNotice} Map geometry is a public GeoJSON asset rendered locally for product demonstration.</p>
      </section>
    </main>
  );
}

function IndiaMap({
  activeSet,
  features,
  scanByName,
  selectedName,
  onSelect,
}: {
  activeSet: Set<string>;
  features: MapFeature[];
  scanByName: Map<string, ScanTerritory>;
  selectedName: string;
  onSelect: (name: string) => void;
}) {
  if (!features.length) {
    return <div className={styles.mapLoading}>Loading India map...</div>;
  }

  return (
    <svg className={styles.indiaMap} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="img" aria-label="India state and union territory operations map">
      {features.map((feature) => {
        const key = normalizeName(feature.stateName);
        const scan = scanByName.get(key);
        const active = activeSet.has(key);
        const selected = feature.stateName === selectedName;
        return (
          <path
            key={feature.id}
            d={feature.path}
            className={`${styles.mapDistrict} ${active ? styles.mapActive : styles.mapMuted} ${selected ? styles.mapSelected : ""}`}
            data-priority={scan?.priority ?? "Stable"}
            data-domain={scan?.domain ?? "Evidence"}
            onClick={() => scan && onSelect(scan.name)}
            onKeyDown={(event) => {
              if (scan && (event.key === "Enter" || event.key === " ")) onSelect(scan.name);
            }}
            role="button"
            tabIndex={scan ? 0 : -1}
          >
            <title>{feature.stateName} - {feature.district}</title>
          </path>
        );
      })}
    </svg>
  );
}

function SelectControl<T extends string>({ label, value, values, onChange }: { label: string; value: T; values: readonly T[]; onChange: (value: T) => void }) {
  return (
    <label className={styles.selectControl}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {values.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" />
    </label>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ChartPanel({ icon, eyebrow, title, rows }: { icon: LucideIcon; eyebrow: string; title: string; rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <article className={styles.panel}>
      <PanelHeader icon={icon} eyebrow={eyebrow} title={title} />
      <div className={styles.barList}>
        {rows.map((row) => (
          <div className={styles.barRow} key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <div><i style={{ width: `${Math.max((row.value / max) * 100, 4)}%` }} /></div>
          </div>
        ))}
      </div>
    </article>
  );
}

function DomainPanel({ rows }: { rows: Array<{ domain: Domain; value: number }> }) {
  return (
    <article className={styles.panel}>
      <PanelHeader icon={Route} eyebrow="Problem domains" title="Agent workload" />
      <div className={styles.domainList}>
        {rows.map((row) => {
          const Icon = domainMeta[row.domain].icon;
          return (
            <div key={row.domain}>
              <Icon aria-hidden="true" style={{ color: domainMeta[row.domain].color }} />
              <span>{domainMeta[row.domain].label}</span>
              <strong>{row.value}</strong>
            </div>
          );
        })}
      </div>
    </article>
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
  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates as number[][][]]
    : geometry.coordinates as number[][][][];
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

function summarizeByRegion(items: ScanTerritory[]) {
  return regions
    .filter((region): region is Region => region !== "All India")
    .map((region) => ({
      label: region,
      value: items.filter((item) => item.region === region).reduce((sum, item) => sum + item.cases, 0),
    }))
    .filter((row) => row.value > 0);
}

function summarizeByDomain(items: ScanTerritory[]) {
  return (Object.keys(domainMeta) as Domain[])
    .map((domain) => ({
      domain,
      value: items.filter((item) => item.domain === domain).reduce((sum, item) => sum + item.cases, 0),
    }))
    .filter((row) => row.value > 0);
}

function summarizeByPriority(items: ScanTerritory[]) {
  return (["Critical", "High", "Watch", "Stable"] as Priority[])
    .map((priority) => ({
      label: priority,
      value: items.filter((item) => item.priority === priority).length,
    }))
    .filter((row) => row.value > 0);
}

function getSortValue(territory: ScanTerritory, sortKey: SortKey) {
  if (sortKey === "evidence") return territory.evidence;
  if (sortKey === "approval") return territory.approval;
  return territory.cases;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
}
