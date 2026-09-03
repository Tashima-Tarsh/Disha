"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Brain,
  ClipboardCheck,
  DatabaseZap,
  Eye,
  FileSearch,
  Fingerprint,
  GitBranch,
  Globe2,
  Landmark,
  LockKeyhole,
  MapPinned,
  Network,
  RadioTower,
  Scale,
  Shield,
  Siren,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import styles from "./dashboard.module.css";

type PrincipalView = {
  email: string;
  roles: string[];
};

type CommandFeed = {
  generatedAt: string;
  title: string;
  invariant: string;
  commandReadiness: {
    score: number;
    productionScore: number;
    extensionScore: number;
    sourceRegistry: number;
    nationalSources: number;
    connectorManifest: number;
  };
  governance: {
    policyGate: string;
    evidenceLedger: string;
    noSyntheticData: boolean;
    extensionStatus: "pass" | "warn" | "fail";
    extensionBlockers: string[];
    extensionWarnings: string[];
  };
  lanes: Array<{
    id: string;
    title: string;
    posture: "operational" | "watch" | "blocked";
    scope: string;
    primaryAuthority: string;
    sourceCount: number;
    evidenceMode: string;
  }>;
  india: {
    totalTerritories: number;
    states: number;
    unionTerritories: number;
    mapMode: string;
    geometryStatus: string;
    regionSummary: Record<string, { total: number; states: number; uts: number }>;
    territories: Array<{
      id: string;
      name: string;
      kind: "State" | "Union Territory";
      region: string;
      posture: string;
      evidenceCoverage: number;
      commandTask: string;
    }>;
  };
  geospatial: {
    layerId: string;
    geometryStatus: string;
    mapMode: string;
    attributionRequired: boolean;
    boundaryImportRule: string;
    sourceHash: string;
    sources: Array<{
      sourceId: string;
      sourceName: string;
      owner: string;
      url: string;
      geographyLevel: string[];
      updateMode: string;
      status: "registered" | "intake_queued" | "license_review";
      limitation: string;
    }>;
  };
  globalFlow: {
    mapAsset: string;
    attribution: string;
    generatedFrom: string;
    nodes: Array<{
      id: string;
      label: string;
      country: string;
      lon: number;
      lat: number;
      kind: "command_hub" | "national_source" | "global_source" | "evidence_store";
    }>;
    flows: Array<{
      id: string;
      from: string;
      to: string;
      label: string;
      authority: string;
      status: "live_source" | "registered_source" | "parser_queued";
      cadence: string;
      hash: string;
    }>;
  };
  claimChains: Array<{
    claimId: string;
    title: string;
    domain: "audit" | "finance" | "geospatial" | "source-registry";
    claim: string;
    status: "publishable_metadata" | "source_gap" | "intake_queued";
    source: {
      authority: string;
      url: string;
      recordId: string;
    };
    policy: {
      decision: "ALLOW_METADATA" | "REQUIRE_PARSER" | "REQUIRE_IMPORT";
      reason: string;
    };
    evidence: {
      sourceRecordHash: string;
      chainHash: string;
      ledgerAction: string;
    };
    chain: Array<{
      step: "source" | "claim" | "policy" | "evidence";
      label: string;
      detail: string;
    }>;
  }>;
  audit: {
    authority: string;
    sourceNotice: string;
    fetchedRecords: number;
    matchedRecords: number;
    pdfLinks: number;
    findingExtraction: string;
    records: Array<{
      id: string;
      title: string;
      government: string | null;
      reportYear: number | null;
      topics: string[];
      detailUrl: string | null;
      pdfUrl: string | null;
      extractionStatus: string;
    }>;
  };
  finance: {
    sourceNotice: string;
    fiscalYears: number;
    documentRecords: number;
    taxCollectionDocuments: number;
    stateDevolutionDocuments: number;
    departmentDocuments: number;
    extraction: string;
    records: Array<{
      id: string;
      fiscalYear: string;
      title: string;
      dataNeed: string;
      sourceUrl: string;
      extractionStatus: string;
    }>;
  };
  connectors: Array<{
    id: string;
    label: string;
    layer: string;
    authority: string;
    cadence: string;
    kind: string;
    needsApiKey: boolean;
    needsBulkImport: boolean;
    endpoint: string;
    safetyBoundary: string;
  }>;
  production: {
    noSyntheticDataRule: string;
    capabilities: Array<{
      id: string;
      title: string;
      status: "working" | "partial" | "blocked";
      evidenceRule: string;
      nextHardening: string[];
    }>;
  };
  extensions: {
    activeExtensions: number;
    gates: Array<{
      id: string;
      title: string;
      kind: string;
      status: "pass" | "warn" | "fail";
      score: number;
    }>;
  };
  sourceRegistry: Array<{
    sourceId: string;
    sourceName: string;
    owner: string;
    domain: string;
    sourceType: string;
    updateMode: string;
    endpoints: number;
    limitations: string[];
  }>;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: CommandFeed }
  | { status: "error"; message: string };

type WorldFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id?: string;
    properties?: { name?: string };
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
  }>;
};

const regionCoordinates: Record<string, { x: number; y: number }> = {
  North: { x: 46, y: 22 },
  "North East": { x: 75, y: 35 },
  East: { x: 64, y: 52 },
  Central: { x: 48, y: 50 },
  West: { x: 30, y: 53 },
  South: { x: 50, y: 76 },
};

const toneClass: Record<string, string> = {
  operational: styles.toneGood,
  working: styles.toneGood,
  pass: styles.toneGood,
  watch: styles.toneWarn,
  partial: styles.toneWarn,
  warn: styles.toneWarn,
  blocked: styles.toneBad,
  fail: styles.toneBad,
};

export function DashboardClient({ principal }: { principal: PrincipalView }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [worldMap, setWorldMap] = useState<WorldFeatureCollection | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedLane, setSelectedLane] = useState("All");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchJson<CommandFeed>("/api/dashboard/command", controller.signal)
      .then((data) => setLoadState({ status: "ready", data }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadState({ status: "error", message: error instanceof Error ? error.message : "Command feed unavailable" });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/data/world-countries.geojson", { cache: "force-cache", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setWorldMap(payload as WorldFeatureCollection | null))
      .catch(() => {
        if (!controller.signal.aborted) setWorldMap(null);
      });
    return () => controller.abort();
  }, []);

  if (loadState.status === "loading") {
    return <DashboardShell principal={principal} body={<LoadingState />} />;
  }

  if (loadState.status === "error") {
    return <DashboardShell principal={principal} body={<ErrorState message={loadState.message} />} />;
  }

  const { data } = loadState;
  const regions = ["All", ...Object.keys(data.india.regionSummary).sort()];
  const lanes = ["All", ...data.lanes.map((lane) => lane.title).sort()];
  const territories = data.india.territories.filter((territory) => selectedRegion === "All" || territory.region === selectedRegion);
  const connectors = data.connectors.filter((connector) => selectedLane === "All" || connector.layer === selectedLane);
  const selectedClaim = data.claimChains.find((claim) => claim.claimId === selectedClaimId) ?? data.claimChains[0];
  const blockedCapabilities = data.production.capabilities.filter((capability) => capability.status === "blocked");
  const partialCapabilities = data.production.capabilities.filter((capability) => capability.status === "partial");
  const attentionItems = [
    ...data.governance.extensionBlockers,
    ...data.governance.extensionWarnings,
    ...blockedCapabilities.flatMap((capability) => capability.nextHardening),
    ...partialCapabilities.flatMap((capability) => capability.nextHardening),
  ];
  const nextAction = attentionItems[0] ?? "No blocking action is reported by the current command feed.";

  return (
    <DashboardShell
      principal={principal}
      body={
        <div className={styles.contentGrid}>
          <section className={styles.commandHero}>
            <div className={styles.heroText}>
              <p className={styles.eyebrow}>DISHA 6.6 / National Command Feed</p>
              <h1>Constitutional Evidence Command Centre</h1>
              <p>{data.invariant}</p>
            </div>
            <div className={styles.readinessDial} aria-label="Command readiness">
              <span>{data.commandReadiness.score}</span>
              <strong>readiness</strong>
              <small>{formatDateTime(data.generatedAt)}</small>
            </div>
          </section>

          <section className={styles.overviewBoard} id="overview" aria-labelledby="overview-title">
            <header className={styles.overviewHeader}>
              <div>
                <p className={styles.eyebrow}>System overview</p>
                <h2 id="overview-title">One view from source intake to accountable action</h2>
                <p>Read the current posture, inspect what needs attention, or move directly into a governed mission.</p>
              </div>
              <div className={styles.overviewActions}>
                <Link className={styles.primaryButton} href="/workbench">Run a governed mission <ArrowUpRight size={15} /></Link>
                <a className={styles.secondaryButton} href="#evidence">Inspect evidence chains</a>
              </div>
            </header>

            <div className={styles.overviewGrid}>
              <OverviewCard
                icon={<RadioTower size={18} />}
                label="Intake"
                value={`${data.commandReadiness.sourceRegistry} sources`}
                detail={`${data.lanes.length} operational lanes across ${data.india.totalTerritories} states and union territories.`}
              />
              <OverviewCard
                icon={<Shield size={18} />}
                label="Governance"
                value={data.governance.policyGate}
                detail={`Evidence ledger: ${data.governance.evidenceLedger}. Synthetic data: ${data.governance.noSyntheticData ? "denied" : "under review"}.`}
              />
              <OverviewCard
                icon={<ClipboardCheck size={18} />}
                label="Review queue"
                value={`${attentionItems.length} items`}
                detail={`${blockedCapabilities.length} blocked and ${partialCapabilities.length} partial production capabilities.`}
                tone={attentionItems.length ? "warn" : "good"}
              />
              <OverviewCard
                icon={<Eye size={18} />}
                label="Next accountable action"
                value="Review required"
                detail={nextAction}
                tone={attentionItems.length ? "warn" : "good"}
              />
            </div>
          </section>

          <section className={styles.kpiGrid} aria-label="Command KPIs">
            <KpiCard icon={<RadioTower size={20} />} label="Command feed" value="LIVE" detail="Single backend contract" tone="good" />
            <KpiCard icon={<DatabaseZap size={20} />} label="Source registry" value={formatNumber(data.commandReadiness.sourceRegistry)} detail={`${data.commandReadiness.nationalSources} national sources`} tone="good" />
            <KpiCard icon={<Network size={20} />} label="Connectors" value={formatNumber(data.commandReadiness.connectorManifest)} detail="Official-source manifest" tone="warn" />
            <KpiCard icon={<Brain size={20} />} label="Extensions" value={formatNumber(data.extensions.activeExtensions)} detail={`${data.commandReadiness.extensionScore}% governance score`} tone={data.governance.extensionStatus === "pass" ? "good" : "warn"} />
          </section>

          <section className={styles.worldBoard}>
            <PanelTitle
              icon={<Globe2 size={18} />}
              title="Constitutional Evidence Atlas"
              subtitle="Explore real-world source-to-evidence movement by operational state. Every line represents a registered DISHA source or connector—not an invented event."
            />
            <WorldFlowMap worldMap={worldMap} flow={data.globalFlow} />
          </section>

          <section className={styles.opsBoard}>
            <section className={styles.mapPanel}>
              <PanelTitle
                icon={<MapPinned size={18} />}
                title="India Command Map"
                subtitle={`${data.india.states} states, ${data.india.unionTerritories} union territories. Geometry status: ${displayState(data.india.geometryStatus)}.`}
              />
              <div className={styles.filterRow}>
                <SelectFilter label="Region" value={selectedRegion} options={regions} onChange={setSelectedRegion} />
                <SelectFilter label="Operational lane" value={selectedLane} options={lanes} onChange={setSelectedLane} />
              </div>
              <IndiaCommandMap territories={territories} regionSummary={data.india.regionSummary} />
            </section>

            <aside className={styles.commandStack}>
              <Panel title="Rules of Engagement" icon={<LockKeyhole size={18} />}>
                <div className={styles.statusList}>
                  <StatusRow label="Policy Gate" value={data.governance.policyGate} tone="good" />
                  <StatusRow label="Evidence Ledger" value={data.governance.evidenceLedger} tone="good" />
                  <StatusRow label="Synthetic data" value={data.governance.noSyntheticData ? "denied" : "review"} tone="good" />
                  <StatusRow label="Extension gate" value={data.governance.extensionStatus} tone={data.governance.extensionStatus === "pass" ? "good" : "warn"} />
                </div>
              </Panel>

              <Panel title="Active Command Lanes" icon={<Siren size={18} />}>
                <div className={styles.laneList}>
                  {data.lanes.slice(0, 7).map((lane) => (
                    <article className={styles.laneItem} key={lane.id}>
                      <div>
                        <strong>{lane.title}</strong>
                        <span>{lane.primaryAuthority}</span>
                      </div>
                      <Badge tone={lane.posture}>{lane.sourceCount} src</Badge>
                    </article>
                  ))}
                </div>
              </Panel>
            </aside>
          </section>

          <section className={styles.evidenceGrid} id="evidence">
            <Panel title="Constitutional Chain Explorer" icon={<Fingerprint size={18} />}>
              <div className={styles.chainExplorer}>
                <div className={styles.claimList}>
                  {data.claimChains.slice(0, 12).map((claim) => (
                    <button
                      className={claim.claimId === selectedClaim.claimId ? styles.claimButtonActive : styles.claimButton}
                      key={claim.claimId}
                      type="button"
                      onClick={() => setSelectedClaimId(claim.claimId)}
                    >
                      <span>{claim.domain}</span>
                      <strong>{claim.title}</strong>
                      <small>{displayState(claim.status)}</small>
                    </button>
                  ))}
                </div>
                <div className={styles.chainDetail}>
                  <div className={styles.chainDetailHead}>
                    <div>
                      <p className={styles.eyebrow}>Claim-level provenance</p>
                      <h3>{selectedClaim.title}</h3>
                    </div>
                    <Badge tone={selectedClaim.status === "publishable_metadata" ? "operational" : "watch"}>{displayState(selectedClaim.status)}</Badge>
                  </div>
                  <p>{selectedClaim.claim}</p>
                  <div className={styles.chainSteps}>
                    {selectedClaim.chain.map((step) => (
                      <article className={styles.chainStep} key={`${selectedClaim.claimId}-${step.step}`}>
                        <BadgeCheck size={16} />
                        <div>
                          <span>{step.step}</span>
                          <strong>{step.label}</strong>
                          <small>{step.detail}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className={styles.hashBlock}>
                    <span>source hash</span>
                    <code>{selectedClaim.evidence.sourceRecordHash}</code>
                    <span>chain hash</span>
                    <code>{selectedClaim.evidence.chainHash}</code>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Geospatial Import Layer" icon={<MapPinned size={18} />}>
              <p className={styles.notice}>{data.geospatial.boundaryImportRule}</p>
              <div className={styles.geoSourceGrid}>
                {data.geospatial.sources.map((source) => (
                  <article className={styles.geoSource} key={source.sourceId}>
                    <div>
                      <strong>{source.sourceName}</strong>
                      <span>{source.owner}</span>
                    </div>
                    <Badge tone={source.status === "license_review" ? "watch" : "partial"}>{displayState(source.status)}</Badge>
                    <small>{source.geographyLevel.join(", ")}</small>
                  </article>
                ))}
              </div>
              <div className={styles.hashBlock}>
                <span>geometry source hash</span>
                <code>{data.geospatial.sourceHash}</code>
              </div>
            </Panel>
          </section>

          <section className={styles.intelGrid}>
            <Panel title="CAG Audit Intelligence Lane" icon={<FileSearch size={18} />}>
              <div className={styles.metricStrip}>
                <Metric label="Fetched" value={data.audit.fetchedRecords} />
                <Metric label="Matched" value={data.audit.matchedRecords} />
                <Metric label="PDF links" value={data.audit.pdfLinks} />
              </div>
              <p className={styles.notice}>{data.audit.sourceNotice}</p>
              <div className={styles.recordList}>
                {data.audit.records.map((record) => (
                  <article className={styles.recordItem} key={record.id}>
                    <div>
                      <strong>{record.title}</strong>
                      <span>{record.government ?? "Government not parsed"} / {record.reportYear ?? "year pending"}</span>
                    </div>
                    <Badge tone={record.extractionStatus === "metadata_only" ? "warn" : "operational"}>{displayState(record.extractionStatus)}</Badge>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="Finance and Tax Evidence Lane" icon={<Banknote size={18} />}>
              <div className={styles.metricStrip}>
                <Metric label="Fiscal years" value={data.finance.fiscalYears} />
                <Metric label="Documents" value={data.finance.documentRecords} />
                <Metric label="State devolution" value={data.finance.stateDevolutionDocuments} />
              </div>
              <p className={styles.notice}>{data.finance.sourceNotice}</p>
              <div className={styles.recordList}>
                {data.finance.records.slice(0, 7).map((record) => (
                  <article className={styles.recordItem} key={record.id}>
                    <div>
                      <strong>{record.title}</strong>
                      <span>{record.fiscalYear} / {displayState(record.dataNeed)}</span>
                    </div>
                    <Badge tone={record.extractionStatus === "source_manifest" ? "operational" : "watch"}>{displayState(record.extractionStatus)}</Badge>
                  </article>
                ))}
              </div>
            </Panel>
          </section>

          <section className={styles.lowerGrid}>
            <Panel title="Connector Mesh" icon={<GitBranch size={18} />}>
              <div className={styles.connectorTable}>
                {connectors.slice(0, 12).map((connector) => (
                  <article className={styles.connectorRow} key={connector.id}>
                    <div>
                      <strong>{connector.label}</strong>
                      <span>{connector.authority}</span>
                    </div>
                    <Badge tone={connector.needsBulkImport || connector.needsApiKey ? "watch" : "operational"}>
                      {connector.needsBulkImport ? "bulk" : connector.needsApiKey ? "key" : connector.cadence}
                    </Badge>
                    <span className={styles.connectorKind}>{connector.kind}</span>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="State and UT Task Queue" icon={<Landmark size={18} />}>
              <div className={styles.coverageList}>
                {territories.slice(0, 10).map((territory) => (
                  <article className={styles.coverageItem} key={territory.name}>
                    <div>
                      <strong>{territory.name}</strong>
                      <span>{territory.commandTask}</span>
                    </div>
                    <ProgressBar value={territory.evidenceCoverage} label={`${territory.evidenceCoverage}%`} />
                  </article>
                ))}
              </div>
            </Panel>
          </section>

          <section className={styles.capabilityBand} id="hardening">
            <PanelTitle icon={<Scale size={18} />} title="Production Hardening Track" subtitle={data.production.noSyntheticDataRule} />
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
          <a href="#overview"><Eye size={18} /> Overview</a>
          <a href="#map"><MapPinned size={18} /> India Map</a>
          <a href="#audit"><FileSearch size={18} /> Audit</a>
          <a href="#evidence"><Fingerprint size={18} /> Evidence</a>
          <a href="#hardening"><ClipboardCheck size={18} /> Hardening</a>
        </nav>
        <div className={styles.railFooter}>
          <span>Mission owner</span>
          <strong>{principal.email}</strong>
          <small>{principal.roles.join(", ")}</small>
        </div>
      </aside>

      <section className={styles.workspace} id="command">
        <div className={styles.topBar}>
          <div><span className={styles.systemDot} /> DISHA governed command runtime</div>
          <div>
            <Link href="/workbench">Workbench <ArrowUpRight size={14} /></Link>
          </div>
        </div>
        {body}
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <div className={styles.statePanel}>
      <RadioTower size={30} />
      <h1>Building command feed</h1>
      <p>Authenticating, pulling official-source connectors, and assembling the governed DISHA 6.6 command model.</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className={styles.statePanel}>
      <AlertTriangle size={30} />
      <h1>Command feed unavailable</h1>
      <p>{message}</p>
      <Link className={styles.primaryButton} href="/login?mode=password&returnUrl=%2Fdashboard">Login again</Link>
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

function OverviewCard({
  icon,
  label,
  value,
  detail,
  tone = "good",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "good" | "warn";
}) {
  return (
    <article className={`${styles.overviewCard} ${styles[`overview_${tone}`]}`}>
      <div className={styles.overviewCardLabel}>{icon}<span>{label}</span></div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function IndiaCommandMap({
  territories,
  regionSummary,
}: {
  territories: CommandFeed["india"]["territories"];
  regionSummary: CommandFeed["india"]["regionSummary"];
}) {
  const plotted = useMemo(
    () =>
      territories.map((territory, index) => {
        const base = regionCoordinates[territory.region] ?? { x: 50, y: 50 };
        const angle = (index % 10) * 0.63;
        const radius = 3 + (index % 6) * 1.8;
        return {
          ...territory,
          x: Math.max(8, Math.min(92, base.x + Math.cos(angle) * radius)),
          y: Math.max(8, Math.min(92, base.y + Math.sin(angle) * radius)),
        };
      }),
    [territories],
  );

  return (
    <div className={styles.mapWrap} id="map">
      <svg viewBox="0 0 100 100" role="img" aria-label="DISHA India command map">
        <path
          className={styles.indiaShape}
          d="M43 8 L55 10 L67 18 L73 31 L70 43 L63 51 L59 66 L52 91 L43 76 L35 66 L25 62 L29 48 L22 38 L31 26 Z"
        />
        <path className={styles.routeLine} d="M47 15 C39 27 35 42 38 56 C42 69 50 77 55 87" />
        <path className={styles.routeLineAlt} d="M29 53 C42 47 55 47 70 34" />
        <path className={styles.routeLine} d="M45 24 C55 30 63 39 65 53" />
        {plotted.map((territory) => (
          <g key={territory.name}>
            <circle className={styles.mapPoint} cx={territory.x} cy={territory.y} r={territory.kind === "State" ? "1.9" : "1.35"} />
            <title>{`${territory.name}: ${territory.commandTask}`}</title>
          </g>
        ))}
      </svg>
      <div className={styles.mapLegend}>
        {Object.entries(regionSummary).map(([region, summary]) => (
          <span key={region}>
            <i /> {region}: {summary.total}
          </span>
        ))}
      </div>
      <div className={styles.mapMetrics}>
        <strong>{territories.length}</strong>
        <span>administrative units in view</span>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.panel} id={title.includes("CAG") ? "audit" : undefined}>
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

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (next: string) => void }) {
  return (
    <label className={styles.selectFilter}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
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
  return <span className={`${styles.badge} ${toneClass[tone] ?? styles.toneWarn}`}>{children}</span>;
}

function WorldFlowMap({ worldMap, flow }: { worldMap: WorldFeatureCollection | null; flow: CommandFeed["globalFlow"] }) {
  const nodeById = useMemo(() => new Map(flow.nodes.map((node) => [node.id, node])), [flow.nodes]);
  const [statusFilter, setStatusFilter] = useState<"all" | CommandFeed["globalFlow"]["flows"][number]["status"]>("all");
  const [selectedFlowId, setSelectedFlowId] = useState(flow.flows[0]?.id ?? "");
  const visibleFlows = flow.flows.filter((item) => statusFilter === "all" || item.status === statusFilter);
  const selectedFlow = visibleFlows.find((item) => item.id === selectedFlowId) ?? visibleFlows[0];

  function chooseFilter(next: typeof statusFilter) {
    setStatusFilter(next);
    const firstMatch = flow.flows.find((item) => next === "all" || item.status === next);
    if (firstMatch) setSelectedFlowId(firstMatch.id);
  }

  return (
    <div className={styles.worldMapShell}>
      <div className={styles.atlasToolbar} aria-label="Evidence Atlas layers">
        <div>
          <span>Evidence layers</span>
          <strong>{visibleFlows.length} of {flow.flows.length} flows visible</strong>
        </div>
        <div className={styles.atlasFilters}>
          {(["all", "live_source", "registered_source", "parser_queued"] as const).map((status) => (
            <button
              aria-pressed={statusFilter === status}
              className={statusFilter === status ? styles.atlasFilterActive : styles.atlasFilter}
              key={status}
              onClick={() => chooseFilter(status)}
              type="button"
            >
              {status === "all" ? "All sources" : displayState(status)}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.atlasWorkspace}>
        <svg viewBox="0 0 1000 520" role="img" aria-label="Interactive Constitutional Evidence Atlas">
          <defs>
            <marker id="flowArrow" markerHeight="8" markerWidth="8" orient="auto" refX="8" refY="4">
              <path d="M0,0 L8,4 L0,8 Z" />
            </marker>
          </defs>
          <rect className={styles.worldOcean} x="0" y="0" width="1000" height="520" rx="18" />
          <g>
            {worldMap?.features.map((feature, index) => (
              <path className={styles.worldCountry} d={featureToPath(feature)} key={feature.id ?? feature.properties?.name ?? index}>
                <title>{feature.properties?.name ?? "Country"}</title>
              </path>
            ))}
          </g>
          <g>
            {visibleFlows.map((item, index) => {
              const from = nodeById.get(item.from);
              const to = nodeById.get(item.to);
              if (!from || !to) return null;
              const start = projectWorld(from.lon, from.lat);
              const end = projectWorld(to.lon, to.lat);
              const curve = `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${Math.min(start.y, end.y) - 42 - (index % 4) * 10} ${end.x} ${end.y}`;
              const isSelected = item.id === selectedFlow?.id;
              return (
                <g
                  aria-label={`Inspect ${item.label}`}
                  className={styles.flowTarget}
                  key={item.id}
                  onClick={() => setSelectedFlowId(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelectedFlowId(item.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <path className={isSelected ? styles.worldFlowSelected : item.status === "live_source" ? styles.worldFlowStrong : styles.worldFlow} d={curve} markerEnd="url(#flowArrow)">
                    <title>{`${item.label} / ${displayState(item.status)} / ${item.authority}`}</title>
                  </path>
                  <path className={styles.flowHitArea} d={curve} />
                  <circle className={styles.flowPulse} r="4">
                    <animateMotion dur={`${5 + (index % 5)}s`} repeatCount="indefinite" path={curve} />
                  </circle>
                </g>
              );
            })}
          </g>
          <g>
            {flow.nodes.map((node) => {
              const point = projectWorld(node.lon, node.lat);
              return (
                <g className={styles.worldNode} key={node.id} transform={`translate(${point.x} ${point.y})`}>
                  <circle r={node.kind === "command_hub" ? 8 : node.kind === "evidence_store" ? 6 : 4} />
                  <text x="10" y="-8">{node.label}</text>
                </g>
              );
            })}
          </g>
        </svg>
        <aside className={styles.atlasInspector} aria-live="polite">
          <p className={styles.eyebrow}>Selected source movement</p>
          {selectedFlow ? (
            <>
              <Badge tone={selectedFlow.status === "live_source" ? "operational" : "watch"}>{displayState(selectedFlow.status)}</Badge>
              <h3>{selectedFlow.label}</h3>
              <dl>
                <div><dt>Authority</dt><dd>{selectedFlow.authority}</dd></div>
                <div><dt>Cadence</dt><dd>{selectedFlow.cadence}</dd></div>
                <div><dt>From</dt><dd>{nodeById.get(selectedFlow.from)?.label ?? selectedFlow.from}</dd></div>
                <div><dt>To</dt><dd>{nodeById.get(selectedFlow.to)?.label ?? selectedFlow.to}</dd></div>
              </dl>
              <div className={styles.atlasHash}><span>Source hash</span><code>{selectedFlow.hash}</code></div>
              <a className={styles.secondaryButton} href="#evidence">Follow the evidence chain</a>
              <Link className={styles.primaryButton} href="/workbench">Open mission workbench <ArrowUpRight size={14} /></Link>
            </>
          ) : <p>No source movement is available for this layer.</p>}
        </aside>
      </div>
      <div className={styles.worldMapFooter}>
        <span>{flow.generatedFrom}</span>
        <span>{flow.attribution}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metric}>
      <strong>{formatNumber(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressTrack}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
      <small>{label}</small>
    </div>
  );
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json() as Promise<T>;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function humanize(value: string): string {
  return value.replace(/_/g, " ");
}

function displayState(value: string): string {
  const label: Record<string, string> = {
    source_gap: "source gap",
    parser_queued: "parser queued",
    intake_queued: "intake queued",
    source_registered_intake_queued: "source registered, intake queued",
    license_review: "license review",
    publishable_metadata: "evidence-ready metadata",
    metadata_only: "metadata captured",
    metadata_captured: "metadata captured",
    pdf_parser_queued: "PDF parser queued",
    table_parser_queued: "table parser queued",
    publication_watch: "publication watch",
    requires_pdf_extraction: "PDF parser queued",
    requires_pdf_table_extraction: "table parser queued",
    requires_source_publication: "publication watch",
    source_manifest: "source manifest",
    tax_collected: "tax collection",
    state_devolution: "state devolution",
    department_finance_audit: "department finance audit",
    transfer_to_states: "transfer to states",
  };
  return label[value] ?? humanize(value);
}

function featureToPath(feature: WorldFeatureCollection["features"][number]): string {
  if (feature.geometry.type === "Polygon") {
    return polygonToPath(feature.geometry.coordinates as number[][][]);
  }
  return (feature.geometry.coordinates as number[][][][]).map((polygon) => polygonToPath(polygon)).join(" ");
}

function polygonToPath(polygon: number[][][]): string {
  return polygon.map((ring) => ring.map(([lon, lat], index) => {
    const point = projectWorld(lon, lat);
    return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join(" ") + " Z").join(" ");
}

function projectWorld(lon: number, lat: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 520,
  };
}
