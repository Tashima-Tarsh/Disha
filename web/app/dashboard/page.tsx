import {
  Activity,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  Database,
  Eye,
  FileText,
  GitBranch,
  Globe2,
  Landmark,
  Layers,
  Lock,
  Map,
  Network,
  Radar,
  Scale,
  Shield,
  type LucideIcon,
} from "lucide-react";

import styles from "./dashboard.module.css";

const versions = [
  {
    id: "1.6",
    name: "Geospatial Detection",
    signal: "Coordinates, sensors, object tracking",
    status: "Tested",
  },
  {
    id: "2.6",
    name: "Sustainable Development",
    signal: "Infrastructure, climate, resource risk",
    status: "Tested",
  },
  {
    id: "3.6",
    name: "Physical Interface",
    signal: "Edge telemetry and device state",
    status: "Tested",
  },
  {
    id: "4.6",
    name: "HSE Intelligence",
    signal: "Health, welfare, education gaps",
    status: "Tested",
  },
  {
    id: "5.6",
    name: "National Audit",
    signal: "RTI, open data, public authority review",
    status: "Tested",
  },
  {
    id: "6.6",
    name: "Gap Closure",
    signal: "Yudh assessment and Vyuha selection",
    status: "Tested",
  },
];

const checks = [
  "Brain graph tests",
  "Ruff lint and format",
  "mypy strict",
  "Bandit SAST",
  "Secret scanning",
  "Dependency audit",
  "SBOM generation",
  "CodeQL actions, Python, JS/TS",
];

const graphNodes = [
  "Intake",
  "Evidence",
  "Context",
  "Reasoning",
  "Router",
  "Action",
  "Yudh",
  "Vyuha",
  "NFU Policy",
  "Human Review",
  "Audit",
  "Memory",
  "Result",
];

const capabilities = [
  {
    title: "Evidence Discipline",
    body: "Every result carries source lists, confidence, evidence class, and explicit verification gaps.",
    icon: FileText,
  },
  {
    title: "Policy Guard",
    body: "No-First-Use blocks retaliatory, destructive, unauthorized, and self-propagating actions.",
    icon: Shield,
  },
  {
    title: "Audit Memory",
    body: "Graph runs create audit events and update working plus episodic memory for continuity.",
    icon: Database,
  },
  {
    title: "Civic Intelligence",
    body: "The version ladder covers geospatial, development, HSE, public audit, and gap closure missions.",
    icon: Landmark,
  },
];

const dossiers = [
  {
    code: "NAT-AUDIT-05",
    title: "RTI contradiction review",
    lane: "Public authority audit",
  },
  {
    code: "HSE-04",
    title: "District health service gap",
    lane: "Service delivery",
  },
  {
    code: "RES-02",
    title: "Bridge flood impact assessment",
    lane: "Infrastructure resilience",
  },
  {
    code: "EDGE-03",
    title: "Edge device telemetry review",
    lane: "Physical interface",
  },
  {
    code: "GEO-01",
    title: "Geospatial perimeter signal",
    lane: "Sensor evidence",
  },
  {
    code: "CLOSURE-06",
    title: "Gap closure corrective action",
    lane: "Yudh/Vyuha routing",
  },
];

const sources = [
  { label: "Official record", level: "High", note: "Source link required" },
  { label: "RTI record", level: "High", note: "Contradiction review" },
  { label: "Sensor signal", level: "Medium", note: "Needs chain context" },
  { label: "Operator note", level: "Low", note: "Human claim only" },
];

const nationalZones = [
  {
    region: "North",
    focus: "Border-state resilience and public infrastructure continuity",
    lane: "Geospatial + audit",
  },
  {
    region: "East",
    focus: "Flood, bridge, health, and school-access stress signals",
    lane: "Development + HSE",
  },
  {
    region: "West",
    focus: "Urban services, port-adjacent infrastructure, and open-data review",
    lane: "Audit + resilience",
  },
  {
    region: "South",
    focus: "Water, climate, edge telemetry, and district service continuity",
    lane: "SETU/VARUNA + edge",
  },
  {
    region: "Central",
    focus: "Gap closure routing across public service and resource evidence",
    lane: "Yudh/Vyuha",
  },
];

const liveSignals = [
  "Open-data evidence stream",
  "RTI contradiction queue",
  "District service-gap watch",
  "Infrastructure resilience lane",
  "Human approval queue",
  "Audit hash-chain continuity",
];

const privacyGuardrails = [
  "No individual-level tracking",
  "No biometric or face surveillance",
  "No hidden collection",
  "Only aggregate, open, consented, or authorized signals",
  "Every claim carries evidence status",
];

export default function DashboardPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="board-title">
        <div className={styles.departmentFrame}>
          <aside className={styles.directorateRail} aria-label="DISHA directorates">
            <div className={styles.sealMark}>
              <Building2 aria-hidden="true" />
              <span>DISHA</span>
            </div>
            <nav>
              <a href="#situation">Situation</a>
              <a href="#sources">Sources</a>
              <a href="#missions">Missions</a>
              <a href="#readiness">Readiness</a>
            </nav>
            <div className={styles.railNote}>
              <span>Posture</span>
              <strong>Defensive</strong>
            </div>
          </aside>

          <div className={styles.board}>
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>DISHA Intelligence Directorate</p>
                <h1 id="board-title">National evidence operations dashboard</h1>
                <p className={styles.lede}>
                  A local situation board for DISHA Brain: source discipline,
                  version routing, lawful action boundaries, audit memory, and
                  production readiness without exposing implementation code.
                </p>
              </div>
              <div
                className={styles.clearanceBox}
                aria-label="Current readiness status"
              >
                <span>Branch PR #73</span>
                <strong>All checks passed</strong>
                <small>Production-readiness spine</small>
              </div>
            </header>

            <section className={styles.statusGrid} aria-label="Readiness indicators">
              <StatusCard icon={ClipboardCheck} label="Graph tests" value="23 passed" />
              <StatusCard icon={Lock} label="Policy posture" value="NFU enforced" />
              <StatusCard icon={GitBranch} label="CI coverage" value="13 green checks" />
              <StatusCard icon={Eye} label="Claim handling" value="[VERIFY REQUIRED]" />
            </section>

            <section className={styles.nationalGrid} aria-label="India observatory">
              <div className={styles.nationalPanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.kicker}>India resilience observatory</p>
                    <h2>National-scale awareness without citizen surveillance</h2>
                  </div>
                  <Globe2 aria-hidden="true" />
                </div>
                <div className={styles.zoneLedger}>
                  {nationalZones.map((zone) => (
                    <article key={zone.region}>
                      <span>{zone.region}</span>
                      <strong>{zone.focus}</strong>
                      <p>{zone.lane}</p>
                    </article>
                  ))}
                </div>
              </div>

              <aside className={styles.livePanel} aria-label="Live signal posture">
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.kicker}>Live posture</p>
                    <h2>Signals under review</h2>
                  </div>
                  <Network aria-hidden="true" />
                </div>
                <div className={styles.liveSignals}>
                  {liveSignals.map((signal) => (
                    <div key={signal}>
                      <span />
                      <p>{signal}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </section>

            <section className={styles.situationGrid} id="situation">
              <div className={styles.situationPanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.kicker}>Situation room</p>
                    <h2>Evidence posture by operational lane</h2>
                  </div>
                  <Radar aria-hidden="true" />
                </div>
                <div className={styles.mapBoard} aria-label="Operational lane map">
                  <div className={styles.mapGrid}>
                    <span className={styles.zoneNorth}>National Audit</span>
                    <span className={styles.zoneWest}>Geospatial</span>
                    <span className={styles.zoneCenter}>DISHA Brain</span>
                    <span className={styles.zoneEast}>HSE</span>
                    <span className={styles.zoneSouth}>Gap Closure</span>
                  </div>
                </div>
              </div>

              <aside className={styles.watchPanel} aria-labelledby="watch-title">
                <p className={styles.kicker}>Watch floor</p>
                <h2 id="watch-title">Standing orders</h2>
                <ul className={styles.truthList}>
                  <li>Unsupported claims stay marked until verified.</li>
                  <li>Ambiguous actions route to human approval.</li>
                  <li>Protected APIs require deployment tokens.</li>
                  <li>Legacy modules need review before promotion.</li>
                </ul>
              </aside>
            </section>

            <section className={styles.commandLayout}>
              <div className={styles.mainPanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.kicker}>Agentic chain</p>
                    <h2>Decision flow under evidence control</h2>
                  </div>
                  <Scale aria-hidden="true" />
                </div>
                <div className={styles.graph} aria-label="DISHA Brain agentic graph">
                  {graphNodes.map((node, index) => (
                    <div className={styles.graphStep} key={node}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{node}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.sourcePanel} id="sources">
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.kicker}>Source desk</p>
                    <h2>Reliability matrix</h2>
                  </div>
                  <BookOpenCheck aria-hidden="true" />
                </div>
                <div className={styles.sourceTable}>
                  {sources.map((source) => (
                    <div key={source.label}>
                      <strong>{source.label}</strong>
                      <span>{source.level}</span>
                      <p>{source.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.capabilityGrid} aria-label="DISHA capabilities">
              {capabilities.map((item) => (
                <article className={styles.capabilityCard} key={item.title}>
                  <item.icon aria-hidden="true" />
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </section>

            <section className={styles.guardrailPanel} aria-label="Privacy guardrails">
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kicker}>Constitutional guardrails</p>
                  <h2>What this system will not do</h2>
                </div>
                <Shield aria-hidden="true" />
              </div>
              <div className={styles.guardrailList}>
                {privacyGuardrails.map((guardrail) => (
                  <span key={guardrail}>{guardrail}</span>
                ))}
              </div>
            </section>

            <section className={styles.versionSection}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kicker}>Version ladder</p>
                  <h2>Six intelligence surfaces, one audited spine</h2>
                </div>
                <Layers aria-hidden="true" />
              </div>
              <div className={styles.versionGrid}>
                {versions.map((version) => (
                  <article className={styles.versionCard} key={version.id}>
                    <span>{version.id}</span>
                    <h3>{version.name}</h3>
                    <p>{version.signal}</p>
                    <strong>{version.status}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.bottomGrid}>
              <div className={styles.checkPanel} id="readiness">
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.kicker}>Readiness ledger</p>
                    <h2>Green gates</h2>
                  </div>
                  <Activity aria-hidden="true" />
                </div>
                <div className={styles.checkList}>
                  {checks.map((check) => (
                    <div key={check}>
                      <span />
                      <p>{check}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.dossierPanel} id="missions">
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.kicker}>Mission docket</p>
                    <h2>Operational scenarios</h2>
                  </div>
                  <Map aria-hidden="true" />
                </div>
                <div className={styles.dossierList}>
                  {dossiers.map((dossier) => (
                    <article key={dossier.code}>
                      <span>{dossier.code}</span>
                      <strong>{dossier.title}</strong>
                      <p>{dossier.lane}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <article className={styles.statusCard}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
