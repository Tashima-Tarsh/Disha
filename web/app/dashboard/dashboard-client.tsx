"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Database,
  FileSearch,
  GitBranch,
  Layers3,
  LockKeyhole,
  MapPinned,
  Network,
  Radar,
  Scale,
  Server,
  Shield,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import styles from "./dashboard.module.css";

type PrincipalView = {
  email: string;
  roles: string[];
};

type HealthResponse = {
  status?: string;
  product?: string;
  lenses?: string[];
  agenticSkills?: string[];
  openDataSources?: string[];
  policyGate?: string;
  evidenceLedger?: string;
  modelProvider?: string;
  sourceRegistry?: string;
  noDemoDataPolicy?: string;
};

type NationalCoverage = {
  total?: number;
  readyForConnector?: number;
  needsBulkImport?: number;
  officialOnly?: number;
};

type NationalSource = {
  id: string;
  title?: string;
  label?: string;
  category?: string;
  authority?: string;
  status?: string;
  url?: string;
  sourceUrl?: string;
  layer?: string;
};

type NationalResponse = {
  generatedAt: string;
  notice: string;
  coverage: NationalCoverage;
  sources: NationalSource[];
};

type TerritoryScan = {
  name: string;
  kind: "State" | "Union Territory";
  region: string;
  priority: "Critical" | "High" | "Watch" | "Stable";
  cases: number;
  evidence: number;
  approval: number;
  closure: number;
  note: string;
  agenticScan?: {
    posture: string;
    nextAction: string;
    confidenceBand: string;
  };
};

type IndiaResponse = {
  generatedAt: string;
  scanId: string;
  sourceNotice: string;
  sources: Array<{
    id: string;
    authority: string;
    url: string;
    ok: boolean;
    checkedAt: string;
    status?: number;
  }>;
  nationalAdministrativeSummary?: {
    authority: string;
    sourceUrl: string;
    reachable: boolean;
    extractionStatus: string;
  };
  scan: TerritoryScan[];
};

type Connector = {
  id: string;
  label: string;
  layer: string;
  authority: string;
  kind: string;
  cadence: string;
  needsApiKey: boolean;
  needsBulkImport: boolean;
  endpoint: string;
  safetyBoundary: string;
};

type ConnectorsResponse = {
  generatedAt: string;
  notice: string;
  connectors: Connector[];
};

type Capability = {
  id: string;
  title: string;
  status: "working" | "partial" | "blocked";
  evidenceRule: string;
  nextHardening: string[];
};

type ProductionResponse = {
  product: string;
  generatedAt: string;
  capabilityScore: number;
  noSyntheticDataRule: string;
  capabilities: Capability[];
};

type ControlPlaneResponse = {
  productLayer: string;
  invariant: string;
  generatedAt: string;
  score: number;
  status: "pass" | "warn" | "fail";
  activeExtensions: number;
  blockers: string[];
  warnings: string[];
  gates: Array<{
    id: string;
    title: string;
    kind: string;
    status: "pass" | "warn" | "fail";
    score: number;
  }>;
};

type DashboardData = {
  health: HealthResponse;
  national: NationalResponse;
  india: IndiaResponse;
  connectors: ConnectorsResponse;
  production: ProductionResponse;
  controlPlane: ControlPlaneResponse;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: DashboardData }
  | { status: "error"; message: string };

const regionCoordinates: Record<string, { x: number; y: number }> = {
  North: { x: 47, y: 23 },
  "North East": { x: 73, y: 34 },
  East: { x: 63, y: 50 },
  Central: { x: 48, y: 51 },
  West: { x: 31, y: 52 },
  South: { x: 49, y: 75 },
};

const priorityClass: Record<TerritoryScan["priority"], string> = {
  Critical: styles.priorityCritical,
  High: styles.priorityHigh,
  Watch: styles.priorityWatch,
  Stable: styles.priorityStable,
};

const statusTone: Record<string, string> = {
  working: styles.toneGood,
  pass: styles.toneGood,
  Stable: styles.toneGood,
  partial: styles.toneWarn,
  warn: styles.toneWarn,
  Watch: styles.toneWarn,
  blocked: styles.toneBad,
  fail: styles.toneBad,
  Critical: styles.toneBad,
  High: styles.toneBad,
};

export function DashboardClient({ principal }: { principal: PrincipalView }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedLayer, setSelectedLayer] = useState("All");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const [health, national, india, connectors, production, controlPlane] = await Promise.all([
          fetchJson<HealthResponse>("/api/v1/health", controller.signal),
          fetchJson<NationalResponse>("/api/dashboard/national", controller.signal),
          fetchJson<IndiaResponse>("/api/dashboard/india", controller.signal),
          fetchJson<ConnectorsResponse>("/api/dashboard/connectors", controller.signal),
          fetchJson<ProductionResponse>("/api/v1/production/readiness", controller.signal),
          fetchJson<ControlPlaneResponse>("/api/v1/extensions/control-plane", controller.signal),
        ]);

        setLoadState({ status: "ready", data: { health, national, india, connectors, production, controlPlane } });
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadState({ status: "error", message: error instanceof Error ? error.message : "Dashboard feed unavailable" });
        }
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, []);

  if (loadState.status === "loading") {
    return <DashboardShell principal={principal} body={<LoadingState />} />;
  }

  if (loadState.status === "error") {
    return <DashboardShell principal={principal} body={<ErrorState message={loadState.message} />} />;
  }

  const { data } = loadState;
  const regions = ["All", ...Array.from(new Set(data.india.scan.map((item) => item.region))).sort()];
  const layers = ["All", ...Array.from(new Set(data.connectors.connectors.map((item) => item.layer))).sort()];
  const filteredScan = data.india.scan.filter((item) => selectedRegion === "All" || item.region === selectedRegion);
  const filteredConnectors = data.connectors.connectors.filter((item) => selectedLayer === "All" || item.layer === selectedLayer);

  return (
    <DashboardShell
      principal={principal}
      body={
        <div className={styles.contentGrid}>
          <section className={styles.commandHeader}>
            <div>
              <p className={styles.eyebrow}>DISHA 6.6 / Constitutional Evidence Operating System</p>
              <h1>National Evidence Operations Dashboard</h1>
              <p className={styles.headerCopy}>
                Live operational view of source readiness, governed extension status, policy boundaries, and India-wide administrative coverage.
              </p>
            </div>
            <div className={styles.headerActions}>
              <span className={styles.livePill}>
                <span aria-hidden="true" /> Connected runtime
              </span>
              <Link className={styles.primaryButton} href="/workbench">
                Open Workbench <ArrowUpRight size={16} />
              </Link>
            </div>
          </section>

          <section className={styles.kpiGrid} aria-label="Operational KPIs">
            <KpiCard
              icon={<Database size={20} />}
              label="Official sources"
              value={formatNumber(data.national.coverage.total ?? data.national.sources.length)}
              detail={`${formatNumber(data.national.coverage.readyForConnector ?? 0)} connector-ready`}
              tone="good"
            />
            <KpiCard
              icon={<MapPinned size={20} />}
              label="State and UT coverage"
              value={formatNumber(data.india.scan.length)}
              detail={`${formatNumber(data.india.scan.filter((item) => item.priority === "Stable").length)} source-linked`}
              tone="good"
            />
            <KpiCard
              icon={<Network size={20} />}
              label="Governed extensions"
              value={formatNumber(data.controlPlane.activeExtensions)}
              detail={`${data.controlPlane.status.toUpperCase()} control-plane gate`}
              tone={data.controlPlane.status === "pass" ? "good" : data.controlPlane.status === "warn" ? "warn" : "bad"}
            />
            <KpiCard
              icon={<Shield size={20} />}
              label="Production spine"
              value={`${Math.round((data.production.capabilityScore ?? 0) * 100)}%`}
              detail="Capability readiness"
              tone={data.production.capabilityScore >= 0.75 ? "good" : "warn"}
            />
          </section>

          <section className={styles.mainPanel}>
            <div className={styles.mapPanel}>
              <PanelTitle icon={<Radar size={18} />} title="India Operational Coverage Map" subtitle={data.india.sourceNotice} />
              <div className={styles.filterRow}>
                <SelectFilter label="Region" value={selectedRegion} options={regions} onChange={setSelectedRegion} />
                <SelectFilter label="Source layer" value={selectedLayer} options={layers} onChange={setSelectedLayer} />
              </div>
              <IndiaOperationsMap territories={filteredScan} />
            </div>

            <aside className={styles.rightStack}>
              <Panel title="Governance State" icon={<Scale size={18} />}>
                <div className={styles.statusList}>
                  <StatusRow label="Policy gate" value={data.health.policyGate ?? "enabled"} tone="good" />
                  <StatusRow label="Evidence ledger" value={data.health.evidenceLedger ?? "available"} tone="good" />
                  <StatusRow label="No synthetic data" value={data.health.noDemoDataPolicy ?? data.production.noSyntheticDataRule} tone="good" />
                  <StatusRow label="Model provider" value={data.health.modelProvider ?? "not configured"} tone="warn" />
                </div>
              </Panel>

              <Panel title="Extension Command Plane" icon={<Brain size={18} />}>
                <div className={styles.extensionScore}>
                  <strong>{Math.round(data.controlPlane.score * 100)}%</strong>
                  <span>{data.controlPlane.status.toUpperCase()}</span>
                </div>
                <p className={styles.muted}>{data.controlPlane.invariant}</p>
                <div className={styles.compactList}>
                  {data.controlPlane.gates.slice(0, 4).map((gate) => (
                    <div className={styles.compactItem} key={gate.id}>
                      <span>{gate.title}</span>
                      <Badge tone={gate.status}>{Math.round(gate.score * 100)}%</Badge>
                    </div>
                  ))}
                </div>
              </Panel>
            </aside>
          </section>

          <section className={styles.lowerGrid}>
            <Panel title="National Source Connector Mesh" icon={<Server size={18} />}>
              <div className={styles.connectorToolbar}>
                <span>{formatNumber(filteredConnectors.length)} connectors in view</span>
                <span>{data.connectors.notice}</span>
              </div>
              <div className={styles.connectorTable}>
                {filteredConnectors.slice(0, 10).map((connector) => (
                  <article className={styles.connectorRow} key={connector.id}>
                    <div>
                      <strong>{connector.label}</strong>
                      <span>{connector.authority}</span>
                    </div>
                    <Badge tone={connector.needsBulkImport ? "warn" : "pass"}>{connector.needsBulkImport ? "bulk import" : connector.cadence}</Badge>
                    <span className={styles.connectorKind}>{connector.kind}</span>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="Administrative Coverage Watch" icon={<Layers3 size={18} />}>
              <div className={styles.coverageList}>
                {filteredScan
                  .slice()
                  .sort((a, b) => a.evidence - b.evidence || a.name.localeCompare(b.name))
                  .slice(0, 8)
                  .map((territory) => (
                    <article className={styles.coverageItem} key={territory.name}>
                      <div>
                        <strong>{territory.name}</strong>
                        <span>{territory.agenticScan?.nextAction ?? territory.note}</span>
                      </div>
                      <ProgressBar value={territory.evidence} label={`${territory.evidence}%`} />
                    </article>
                  ))}
              </div>
            </Panel>
          </section>

          <section className={styles.capabilityBand}>
            <PanelTitle icon={<GitBranch size={18} />} title="Production Capability Track" subtitle="Only source-backed capabilities are marked working." />
            <div className={styles.capabilityGrid}>
              {data.production.capabilities.map((capability) => (
                <article className={styles.capabilityCard} key={capability.id}>
                  <div className={styles.capabilityHeader}>
                    <strong>{capability.title}</strong>
                    <Badge tone={capability.status}>{capability.status}</Badge>
                  </div>
                  <p>{capability.evidenceRule}</p>
                  <span>{capability.nextHardening[0]}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      }
    />
  );
}

function DashboardShell({ principal, body }: { principal: PrincipalView; body: ReactNode }) {
  return (
    <main className={styles.shell}>
      <aside className={styles.rail}>
        <div className={styles.mark}>
          <Shield size={24} />
          <div>
            <strong>DISHA</strong>
            <span>6.6</span>
          </div>
        </div>
        <nav className={styles.railNav} aria-label="Dashboard sections">
          <a href="#operations"><Activity size={18} /> Ops</a>
          <a href="#map"><MapPinned size={18} /> Map</a>
          <a href="#evidence"><FileSearch size={18} /> Evidence</a>
          <a href="#policy"><LockKeyhole size={18} /> Policy</a>
        </nav>
        <div className={styles.railFooter}>
          <span>Signed in</span>
          <strong>{principal.email}</strong>
          <small>{principal.roles.join(", ")}</small>
        </div>
      </aside>

      <section className={styles.workspace} id="operations">
        <div className={styles.topBar}>
          <div>
            <span className={styles.systemDot} />
            DISHA command runtime
          </div>
          <div>Policy-gated / Evidence-first / Citizen accountable</div>
        </div>
        {body}
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <div className={styles.statePanel}>
      <Radar size={28} />
      <h1>Connecting DISHA 6.6 command dashboard</h1>
      <p>Loading governed runtime, national source registry, India administrative scan, and extension control-plane.</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className={styles.statePanel}>
      <AlertTriangle size={28} />
      <h1>Dashboard feed unavailable</h1>
      <p>{message}</p>
      <Link className={styles.primaryButton} href="/workbench">Open Workbench</Link>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "good" | "warn" | "bad";
}) {
  return (
    <article className={`${styles.kpiCard} ${styles[`kpi_${tone}`]}`}>
      <div className={styles.kpiIcon}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function IndiaOperationsMap({ territories }: { territories: TerritoryScan[] }) {
  const plotted = useMemo(
    () =>
      territories.map((territory, index) => {
        const base = regionCoordinates[territory.region] ?? { x: 50, y: 50 };
        const angle = (index % 9) * 0.7;
        const radius = 3 + (index % 5) * 2;
        return {
          ...territory,
          x: Math.max(9, Math.min(91, base.x + Math.cos(angle) * radius)),
          y: Math.max(9, Math.min(91, base.y + Math.sin(angle) * radius)),
        };
      }),
    [territories],
  );

  return (
    <div className={styles.mapWrap} id="map">
      <svg viewBox="0 0 100 100" role="img" aria-label="India administrative source coverage map">
        <path
          className={styles.indiaShape}
          d="M43 9 L56 11 L67 18 L73 31 L70 44 L62 52 L59 67 L51 90 L43 76 L35 66 L26 62 L29 48 L22 38 L31 26 Z"
        />
        <path className={styles.routeLine} d="M47 16 C39 27 34 42 38 55 C41 68 50 76 55 86" />
        <path className={styles.routeLineAlt} d="M31 52 C43 47 55 47 69 34" />
        {plotted.map((territory) => (
          <g key={territory.name}>
            <circle className={`${styles.mapPoint} ${priorityClass[territory.priority]}`} cx={territory.x} cy={territory.y} r="1.8" />
            <title>{`${territory.name}: ${territory.evidence}% evidence coverage, ${territory.agenticScan?.confidenceBand ?? territory.priority}`}</title>
          </g>
        ))}
      </svg>
      <div className={styles.mapLegend}>
        <span><i className={styles.priorityStable} /> Stable source-linked</span>
        <span><i className={styles.priorityWatch} /> Verification watch</span>
        <span><i className={styles.priorityHigh} /> High attention</span>
      </div>
      <div className={styles.mapMetrics}>
        <strong>{territories.length}</strong>
        <span>states and UTs in current filter</span>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.panel}>
      <PanelTitle icon={icon} title={title} />
      {children}
    </section>
  );
}

function PanelTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <header className={styles.panelTitle}>
      <div>{icon}</div>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </header>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <label className={styles.selectFilter}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "bad" }) {
  return (
    <div className={styles.statusRow}>
      <span>{label}</span>
      <strong className={styles[`tone_${tone}`]}>{value}</strong>
    </div>
  );
}

function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`${styles.badge} ${statusTone[tone] ?? styles.toneWarn}`}>{children}</span>;
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressTrack}>
        <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <small>{label}</small>
    </div>
  );
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}
