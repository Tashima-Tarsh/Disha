import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  Filter,
  Landmark,
  MapPinned,
  ShieldCheck,
  Stethoscope,
  Waves,
} from "lucide-react";

import styles from "./dashboard.module.css";

const filters = [
  { label: "Region", value: "All India" },
  { label: "Domain", value: "All DISHA modules" },
  { label: "Evidence", value: "Verified + review" },
  { label: "Priority", value: "High and medium" },
];

const kpis = [
  { label: "Active public-interest cases", value: "86", delta: "+12 this week" },
  { label: "Evidence confidence", value: "74%", delta: "source-linked" },
  { label: "Unresolved claims", value: "19", delta: "need verification" },
  { label: "Human approval queue", value: "7", delta: "policy-gated" },
  { label: "Average risk score", value: "0.62", delta: "medium posture" },
];

const domains = [
  { name: "National audit", value: 24, tone: "strong" },
  { name: "HSE service gaps", value: 19, tone: "warm" },
  { name: "Infrastructure resilience", value: 16, tone: "soft" },
  { name: "Geospatial public safety", value: 13, tone: "soft" },
  { name: "Edge telemetry", value: 8, tone: "pale" },
  { name: "Gap closure", value: 6, tone: "pale" },
];

const evidenceQuality = [
  { label: "Official / RTI / audit record", value: 43 },
  { label: "Open data / document", value: 31 },
  { label: "Sensor / telemetry", value: 17 },
  { label: "Unresolved / allegation", value: 9 },
];

const regionalMatrix = [
  { region: "North", risk: "Medium", cases: 17, lead: "Public asset continuity" },
  { region: "East", risk: "High", cases: 22, lead: "Flood and service gaps" },
  { region: "West", risk: "Medium", cases: 14, lead: "Open-data audit" },
  { region: "South", risk: "Medium", cases: 18, lead: "Water and edge telemetry" },
  { region: "Central", risk: "High", cases: 15, lead: "Gap closure backlog" },
];

const cases = [
  {
    id: "DA-501",
    problem: "RTI response conflicts with public authority data",
    module: "5.6 National Audit",
    evidence: "RTI record",
    risk: "High",
    action: "Contradiction register",
  },
  {
    id: "HS-224",
    problem: "District health and school access gap",
    module: "4.6 HSE",
    evidence: "Document",
    risk: "Medium",
    action: "Service gap report",
  },
  {
    id: "IR-172",
    problem: "Flood impact on bridge and road infrastructure",
    module: "2.6 Resilience",
    evidence: "Open data",
    risk: "High",
    action: "Prioritise resilience",
  },
  {
    id: "GT-118",
    problem: "Repeated movement near public-safety perimeter",
    module: "1.6 Geospatial",
    evidence: "Sensor signal",
    risk: "Medium",
    action: "Preserve evidence",
  },
  {
    id: "GC-066",
    problem: "Missing audit trail and delayed corrective action",
    module: "6.6 Gap Closure",
    evidence: "Audit report",
    risk: "High",
    action: "Yudh/Vyuha routing",
  },
];

const decisions = [
  "Prioritise official records, RTI records, open data, audit records, and consented telemetry.",
  "Route every case through evidence class, confidence level, risk score, policy status, and human approval requirement.",
  "Block retaliation, unauthorized access, destructive actions, and individual-level surveillance.",
  "Treat unsupported claims as verification work, not truth.",
];

const moduleIcons = [Landmark, Stethoscope, Waves, MapPinned, Database, ShieldCheck];

export default function DashboardPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="dashboard-title">
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>DISHA Public-Interest Intelligence</p>
            <h1 id="dashboard-title">Operational analytics for evidence, risk, and gap closure</h1>
            <p>
              DISHA helps an operator turn fragmented public-sector signals into
              source-linked cases: what happened, how strong the evidence is, what
              risk exists, and what lawful action should happen next.
            </p>
          </div>
          <div className={styles.problemCard}>
            <span>Problem being solved</span>
            <strong>Public decisions without reliable evidence</strong>
            <p>
              The dashboard tracks gaps, contradictions, service failures, and
              resilience risks without exposing implementation internals or
              collecting personal data.
            </p>
          </div>
        </header>

        <section className={styles.filterBar} aria-label="Dashboard filters">
          <div className={styles.filterTitle}>
            <Filter aria-hidden="true" />
            <span>Filters</span>
          </div>
          {filters.map((filter) => (
            <button type="button" key={filter.label}>
              <span>{filter.label}</span>
              <strong>{filter.value}</strong>
            </button>
          ))}
        </section>

        <section className={styles.kpiGrid} aria-label="Key indicators">
          {kpis.map((kpi) => (
            <article className={styles.kpiCard} key={kpi.label}>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <p>{kpi.delta}</p>
            </article>
          ))}
        </section>

        <section className={styles.analyticsGrid}>
          <article className={styles.panel}>
            <PanelHeader
              icon={BarChart3}
              eyebrow="Workload"
              title="Cases by DISHA problem domain"
            />
            <div className={styles.barList}>
              {domains.map((domain, index) => {
                const Icon = moduleIcons[index];
                return (
                  <div className={styles.barRow} key={domain.name}>
                    <div>
                      <Icon aria-hidden="true" />
                      <span>{domain.name}</span>
                    </div>
                    <strong>{domain.value}</strong>
                    <div className={styles.barTrack}>
                      <span
                        className={styles[domain.tone]}
                        style={{ width: `${domain.value * 3.2}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className={styles.panel}>
            <PanelHeader
              icon={CheckCircle2}
              eyebrow="Evidence quality"
              title="What the system can trust"
            />
            <div className={styles.donutWrap}>
              <div className={styles.donut} aria-hidden="true" />
              <div className={styles.legend}>
                {evidenceQuality.map((item) => (
                  <div key={item.label}>
                    <span>{item.value}%</span>
                    <p>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className={styles.midGrid}>
          <article className={styles.panel}>
            <PanelHeader
              icon={MapPinned}
              eyebrow="Regional posture"
              title="India resilience matrix"
            />
            <div className={styles.regionGrid}>
              {regionalMatrix.map((row) => (
                <div className={styles.regionCard} key={row.region}>
                  <span>{row.region}</span>
                  <strong>{row.risk}</strong>
                  <p>{row.cases} cases</p>
                  <small>{row.lead}</small>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <PanelHeader
              icon={AlertTriangle}
              eyebrow="Decision rules"
              title="Operator guardrails"
            />
            <div className={styles.decisionList}>
              {decisions.map((decision) => (
                <div key={decision}>
                  <span />
                  <p>{decision}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className={styles.panel}>
          <PanelHeader
            icon={ClipboardList}
            eyebrow="Case table"
            title="Current evidence work queue"
          />
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Problem</th>
                  <th>Module</th>
                  <th>Evidence</th>
                  <th>Risk</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.problem}</td>
                    <td>{item.module}</td>
                    <td>{item.evidence}</td>
                    <td>
                      <span className={item.risk === "High" ? styles.highRisk : styles.mediumRisk}>
                        {item.risk}
                      </span>
                    </td>
                    <td>{item.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function PanelHeader({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: typeof BarChart3;
  eyebrow: string;
  title: string;
}) {
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
