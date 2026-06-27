import {
  Activity,
  ClipboardCheck,
  Database,
  Eye,
  FileText,
  GitBranch,
  Landmark,
  Layers,
  Lock,
  Map,
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
  "RTI contradiction review",
  "District health service gap",
  "Bridge flood impact assessment",
  "Edge device telemetry review",
  "Geospatial perimeter signal",
  "Gap closure corrective action",
];

export default function DashboardPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="board-title">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>DISHA Strategic Intelligence Board</p>
            <h1 id="board-title">Evidence-first operational command view</h1>
            <p className={styles.lede}>
              A local dashboard for the DISHA Brain spine: versioned intelligence,
              defensive policy, audit memory, and production readiness without
              exposing implementation code.
            </p>
          </div>
          <div className={styles.clearanceBox} aria-label="Current readiness status">
            <span>PR #73</span>
            <strong>All checks passed</strong>
            <small>Production-readiness branch</small>
          </div>
        </header>

        <section className={styles.statusGrid} aria-label="Readiness indicators">
          <StatusCard icon={ClipboardCheck} label="Graph tests" value="23 passed" />
          <StatusCard icon={Lock} label="Policy posture" value="NFU enforced" />
          <StatusCard icon={GitBranch} label="CI coverage" value="13 green checks" />
          <StatusCard icon={Eye} label="Claim handling" value="[VERIFY REQUIRED]" />
        </section>

        <section className={styles.commandLayout}>
          <div className={styles.mainPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>Agentic graph</p>
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

          <aside className={styles.sidePanel} aria-labelledby="watch-title">
            <p className={styles.kicker}>Watch floor</p>
            <h2 id="watch-title">Operational truth</h2>
            <ul className={styles.truthList}>
              <li>Unsupported claims stay marked until verified.</li>
              <li>Ambiguous actions route to human approval.</li>
              <li>Protected APIs require deployment tokens.</li>
              <li>Legacy modules need review before promotion.</li>
            </ul>
          </aside>
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
          <div className={styles.checkPanel}>
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

          <div className={styles.dossierPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>Demo dossiers</p>
                <h2>Operational scenarios</h2>
              </div>
              <Map aria-hidden="true" />
            </div>
            <div className={styles.dossierList}>
              {dossiers.map((dossier) => (
                <span key={dossier}>{dossier}</span>
              ))}
            </div>
          </div>
        </section>
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
