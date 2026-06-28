"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileSearch,
  Filter,
  Gavel,
  Landmark,
  MapPinned,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

import styles from "./dashboard.module.css";

type Region = "North" | "South" | "East" | "West" | "Central" | "North East";
type TerritoryKind = "State" | "Union Territory";
type Priority = "Critical" | "High" | "Watch" | "Stable";
type Domain = "Constitutional" | "Service" | "Resilience" | "Evidence";
type SortKey = "cases" | "evidence" | "approval";

type Territory = {
  name: string;
  kind: TerritoryKind;
  region: Region;
  domain: Domain;
  priority: Priority;
  cases: number;
  evidence: number;
  approval: number;
  note: string;
};

type LiveTerritory = Territory & {
  liveCases: number;
  liveEvidence: number;
  liveApproval: number;
  closure: number;
};

const territories: Territory[] = [
  { name: "Andhra Pradesh", kind: "State", region: "South", domain: "Service", priority: "High", cases: 24, evidence: 73, approval: 5, note: "district service access" },
  { name: "Arunachal Pradesh", kind: "State", region: "North East", domain: "Resilience", priority: "Watch", cases: 10, evidence: 62, approval: 3, note: "border-area public assets" },
  { name: "Assam", kind: "State", region: "North East", domain: "Resilience", priority: "Critical", cases: 31, evidence: 69, approval: 8, note: "flood and relief records" },
  { name: "Bihar", kind: "State", region: "East", domain: "Service", priority: "High", cases: 29, evidence: 66, approval: 7, note: "welfare delivery gaps" },
  { name: "Chhattisgarh", kind: "State", region: "Central", domain: "Evidence", priority: "Watch", cases: 18, evidence: 64, approval: 5, note: "field evidence review" },
  { name: "Goa", kind: "State", region: "West", domain: "Evidence", priority: "Stable", cases: 7, evidence: 81, approval: 1, note: "public record sampling" },
  { name: "Gujarat", kind: "State", region: "West", domain: "Resilience", priority: "High", cases: 25, evidence: 76, approval: 4, note: "coastal resilience" },
  { name: "Haryana", kind: "State", region: "North", domain: "Constitutional", priority: "Watch", cases: 16, evidence: 70, approval: 4, note: "authority-response review" },
  { name: "Himachal Pradesh", kind: "State", region: "North", domain: "Resilience", priority: "High", cases: 21, evidence: 68, approval: 6, note: "landslide asset risk" },
  { name: "Jharkhand", kind: "State", region: "East", domain: "Service", priority: "High", cases: 23, evidence: 63, approval: 6, note: "education and welfare access" },
  { name: "Karnataka", kind: "State", region: "South", domain: "Evidence", priority: "Watch", cases: 19, evidence: 78, approval: 3, note: "open-data reconciliation" },
  { name: "Kerala", kind: "State", region: "South", domain: "Resilience", priority: "Watch", cases: 15, evidence: 82, approval: 2, note: "water and health continuity" },
  { name: "Madhya Pradesh", kind: "State", region: "Central", domain: "Service", priority: "High", cases: 27, evidence: 65, approval: 6, note: "district gap closure" },
  { name: "Maharashtra", kind: "State", region: "West", domain: "Constitutional", priority: "High", cases: 33, evidence: 79, approval: 5, note: "large-scale public records" },
  { name: "Manipur", kind: "State", region: "North East", domain: "Evidence", priority: "Critical", cases: 22, evidence: 57, approval: 9, note: "verification-gated claims" },
  { name: "Meghalaya", kind: "State", region: "North East", domain: "Resilience", priority: "Watch", cases: 11, evidence: 67, approval: 3, note: "terrain and service continuity" },
  { name: "Mizoram", kind: "State", region: "North East", domain: "Service", priority: "Watch", cases: 9, evidence: 66, approval: 2, note: "health access records" },
  { name: "Nagaland", kind: "State", region: "North East", domain: "Evidence", priority: "Watch", cases: 8, evidence: 61, approval: 3, note: "source review needed" },
  { name: "Odisha", kind: "State", region: "East", domain: "Resilience", priority: "High", cases: 26, evidence: 72, approval: 5, note: "cyclone and welfare records" },
  { name: "Punjab", kind: "State", region: "North", domain: "Service", priority: "Watch", cases: 14, evidence: 74, approval: 3, note: "public service queue" },
  { name: "Rajasthan", kind: "State", region: "North", domain: "Resilience", priority: "High", cases: 28, evidence: 71, approval: 6, note: "water and rural access" },
  { name: "Sikkim", kind: "State", region: "North East", domain: "Resilience", priority: "Watch", cases: 6, evidence: 70, approval: 1, note: "mountain asset continuity" },
  { name: "Tamil Nadu", kind: "State", region: "South", domain: "Constitutional", priority: "High", cases: 30, evidence: 80, approval: 4, note: "public authority records" },
  { name: "Telangana", kind: "State", region: "South", domain: "Evidence", priority: "Watch", cases: 17, evidence: 77, approval: 3, note: "audit-source matching" },
  { name: "Tripura", kind: "State", region: "North East", domain: "Service", priority: "Watch", cases: 8, evidence: 64, approval: 2, note: "service record review" },
  { name: "Uttar Pradesh", kind: "State", region: "North", domain: "Service", priority: "Critical", cases: 42, evidence: 67, approval: 10, note: "large district backlog" },
  { name: "Uttarakhand", kind: "State", region: "North", domain: "Resilience", priority: "High", cases: 20, evidence: 69, approval: 5, note: "hill infrastructure risk" },
  { name: "West Bengal", kind: "State", region: "East", domain: "Constitutional", priority: "High", cases: 27, evidence: 73, approval: 5, note: "record contradiction review" },
  { name: "Andaman and Nicobar Islands", kind: "Union Territory", region: "South", domain: "Resilience", priority: "Watch", cases: 5, evidence: 68, approval: 1, note: "island continuity" },
  { name: "Chandigarh", kind: "Union Territory", region: "North", domain: "Constitutional", priority: "Stable", cases: 4, evidence: 83, approval: 1, note: "urban record audit" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", kind: "Union Territory", region: "West", domain: "Evidence", priority: "Stable", cases: 5, evidence: 75, approval: 1, note: "record consolidation" },
  { name: "Delhi", kind: "Union Territory", region: "North", domain: "Constitutional", priority: "High", cases: 24, evidence: 81, approval: 4, note: "authority accountability" },
  { name: "Jammu and Kashmir", kind: "Union Territory", region: "North", domain: "Resilience", priority: "High", cases: 18, evidence: 65, approval: 6, note: "public asset continuity" },
  { name: "Ladakh", kind: "Union Territory", region: "North", domain: "Resilience", priority: "Watch", cases: 7, evidence: 63, approval: 2, note: "remote infrastructure" },
  { name: "Lakshadweep", kind: "Union Territory", region: "South", domain: "Resilience", priority: "Watch", cases: 3, evidence: 69, approval: 1, note: "island public services" },
  { name: "Puducherry", kind: "Union Territory", region: "South", domain: "Service", priority: "Stable", cases: 6, evidence: 76, approval: 1, note: "health-service records" },
];

const regions: Array<"All India" | Region> = ["All India", "North", "South", "East", "West", "Central", "North East"];
const domains: Array<"All domains" | Domain> = ["All domains", "Constitutional", "Service", "Resilience", "Evidence"];
const priorities: Array<"All priorities" | Priority> = ["All priorities", "Critical", "High", "Watch", "Stable"];

const domainMeta: Record<Domain, { icon: LucideIcon; label: string; color: string }> = {
  Constitutional: { icon: Landmark, label: "Constitutional audit", color: "#d8a235" },
  Service: { icon: ClipboardList, label: "Service-gap protection", color: "#7aaa5d" },
  Resilience: { icon: Route, label: "Infrastructure resilience", color: "#d87855" },
  Evidence: { icon: FileSearch, label: "Evidence verification", color: "#5aa6a0" },
};

export default function DashboardPage() {
  const [selectedRegion, setSelectedRegion] = useState<(typeof regions)[number]>("All India");
  const [selectedDomain, setSelectedDomain] = useState<(typeof domains)[number]>("All domains");
  const [selectedPriority, setSelectedPriority] = useState<(typeof priorities)[number]>("All priorities");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cases");
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedTerritory, setSelectedTerritory] = useState("Uttar Pradesh");

  const liveTerritories = useMemo(
    () =>
      territories.map((territory, index) => {
        const wave = ((refreshTick + index * 3) % 7) - 3;
        const evidenceWave = ((refreshTick * 2 + index) % 5) - 2;
        const liveCases = Math.max(1, territory.cases + wave);
        const liveEvidence = clamp(territory.evidence + evidenceWave, 42, 94);
        return {
          ...territory,
          liveCases,
          liveEvidence,
          liveApproval: Math.max(0, territory.approval + (wave > 1 ? 1 : 0)),
          closure: clamp(100 - Math.round(liveCases * 1.3) + Math.round(liveEvidence / 4), 18, 91),
        };
      }),
    [refreshTick],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return liveTerritories
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
  }, [liveTerritories, search, selectedDomain, selectedPriority, selectedRegion, sortKey]);

  const selected =
    liveTerritories.find((territory) => territory.name === selectedTerritory) ??
    filtered[0] ??
    liveTerritories[0];
  const totalCases = filtered.reduce((sum, territory) => sum + territory.liveCases, 0);
  const approvalQueue = filtered.reduce((sum, territory) => sum + territory.liveApproval, 0);
  const averageEvidence = Math.round(filtered.reduce((sum, territory) => sum + territory.liveEvidence, 0) / Math.max(filtered.length, 1));
  const averageClosure = Math.round(filtered.reduce((sum, territory) => sum + territory.closure, 0) / Math.max(filtered.length, 1));
  const criticalCount = filtered.filter((territory) => territory.priority === "Critical").length;
  const regionRows = summarizeByRegion(filtered);
  const domainRows = summarizeByDomain(filtered);
  const priorityRows = summarizeByPriority(filtered);
  const lastUpdated = new Date(Date.now() + refreshTick * 60000).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="dashboard-title">
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>DISHA Bharat Operations View</p>
            <h1 id="dashboard-title">Constitutional audit and public protection across India</h1>
            <p>
              Interactive BI view for source-linked public evidence, service gaps,
              resilience risk, and lawful action. Demo operational data only; not a
              government claim.
            </p>
          </div>
          <div className={styles.heroPanel}>
            <div>
              <RefreshCw aria-hidden="true" />
              <span>Live demo cycle</span>
            </div>
            <strong>{lastUpdated}</strong>
            <button type="button" onClick={() => setRefreshTick((tick) => tick + 1)}>
              Refresh metrics
            </button>
          </div>
        </header>

        <section className={styles.filterBar} aria-label="Dashboard filters">
          <div className={styles.filterTitle}>
            <Filter aria-hidden="true" />
            <span>Slicers</span>
          </div>
          <SelectControl label="Region" value={selectedRegion} values={regions} onChange={setSelectedRegion} />
          <SelectControl label="Domain" value={selectedDomain} values={domains} onChange={setSelectedDomain} />
          <SelectControl label="Priority" value={selectedPriority} values={priorities} onChange={setSelectedPriority} />
          <label className={styles.searchControl}>
            <span>Search</span>
            <Search aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="State, UT, note, region" />
          </label>
        </section>

        <section className={styles.kpiGrid} aria-label="Dashboard indicators">
          <Kpi label="Territories in view" value={String(filtered.length)} detail="after slicers and search" icon={MapPinned} />
          <Kpi label="Public-interest cases" value={String(totalCases)} detail="current demo workload" icon={ClipboardList} />
          <Kpi label="Evidence readiness" value={`${averageEvidence}%`} detail="source confidence average" icon={CheckCircle2} />
          <Kpi label="Human approval queue" value={String(approvalQueue)} detail="policy-gated actions" icon={Gavel} />
          <Kpi label="Closure readiness" value={`${averageClosure}%`} detail="audit-to-action progress" icon={ShieldCheck} />
          <Kpi label="Critical territories" value={String(criticalCount)} detail="senior review required" icon={AlertTriangle} />
        </section>

        <section className={styles.biGrid}>
          <article className={styles.atlasPanel}>
            <PanelHeader icon={MapPinned} eyebrow="Selectable India board" title="All states and union territories" />
            <div className={styles.toolRow}>
              <button type="button" className={sortKey === "cases" ? styles.activeTool : ""} onClick={() => setSortKey("cases")}>
                <ArrowUpDown aria-hidden="true" /> Cases
              </button>
              <button type="button" className={sortKey === "evidence" ? styles.activeTool : ""} onClick={() => setSortKey("evidence")}>
                <ArrowUpDown aria-hidden="true" /> Evidence
              </button>
              <button type="button" className={sortKey === "approval" ? styles.activeTool : ""} onClick={() => setSortKey("approval")}>
                <ArrowUpDown aria-hidden="true" /> Approval
              </button>
            </div>
            <div className={styles.territoryGrid}>
              {filtered.map((territory) => {
                const Icon = domainMeta[territory.domain].icon;
                const isSelected = territory.name === selected.name;
                return (
                  <button
                    className={`${styles.territoryCard} ${styles[territory.priority.toLowerCase()]} ${isSelected ? styles.selectedCard : ""}`}
                    type="button"
                    key={territory.name}
                    onClick={() => setSelectedTerritory(territory.name)}
                  >
                    <div>
                      <Icon aria-hidden="true" />
                      <span>{territory.kind}</span>
                    </div>
                    <strong>{territory.name}</strong>
                    <p>{territory.note}</p>
                    <small>{territory.liveCases} cases | {territory.liveEvidence}% evidence</small>
                  </button>
                );
              })}
            </div>
          </article>

          <aside className={styles.drillPanel}>
            <PanelHeader icon={FileSearch} eyebrow="Drill-through" title={selected.name} />
            <div className={styles.scoreRing} style={{ "--score": `${selected.liveEvidence * 3.6}deg` } as CSSProperties}>
              <strong>{selected.liveEvidence}%</strong>
              <span>evidence</span>
            </div>
            <div className={styles.detailList}>
              <Detail label="Region" value={selected.region} />
              <Detail label="Domain" value={domainMeta[selected.domain].label} />
              <Detail label="Priority" value={selected.priority} />
              <Detail label="Cases" value={String(selected.liveCases)} />
              <Detail label="Approval queue" value={String(selected.liveApproval)} />
              <Detail label="Closure readiness" value={`${selected.closure}%`} />
            </div>
          </aside>
        </section>

        <section className={styles.analyticsGrid}>
          <ChartPanel icon={Landmark} eyebrow="Regional posture" title="Cases by zone" rows={regionRows} />
          <DomainPanel rows={domainRows} />
          <PriorityPanel rows={priorityRows} />
        </section>
      </section>
    </main>
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

function Kpi({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <article className={styles.kpiCard}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
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
      <PanelHeader icon={FileSearch} eyebrow="Problem domains" title="Workload split" />
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

function PriorityPanel({ rows }: { rows: Array<{ label: Priority; value: number }> }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <article className={styles.panel}>
      <PanelHeader icon={AlertTriangle} eyebrow="Priority mix" title="Review posture" />
      <div className={styles.priorityStack}>
        {rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <i style={{ width: `${Math.max((row.value / Math.max(total, 1)) * 100, 5)}%` }} />
          </div>
        ))}
      </div>
    </article>
  );
}

function summarizeByRegion(items: LiveTerritory[]) {
  return regions
    .filter((region): region is Region => region !== "All India")
    .map((region) => ({
      label: region,
      value: items.filter((item) => item.region === region).reduce((sum, item) => sum + item.liveCases, 0),
    }))
    .filter((row) => row.value > 0);
}

function summarizeByDomain(items: LiveTerritory[]) {
  return (Object.keys(domainMeta) as Domain[])
    .map((domain) => ({
      domain,
      value: items.filter((item) => item.domain === domain).reduce((sum, item) => sum + item.liveCases, 0),
    }))
    .filter((row) => row.value > 0);
}

function summarizeByPriority(items: LiveTerritory[]) {
  return (["Critical", "High", "Watch", "Stable"] as Priority[])
    .map((priority) => ({
      label: priority,
      value: items.filter((item) => item.priority === priority).length,
    }))
    .filter((row) => row.value > 0);
}

function getSortValue(territory: LiveTerritory, sortKey: SortKey) {
  if (sortKey === "evidence") return territory.liveEvidence;
  if (sortKey === "approval") return territory.liveApproval;
  return territory.liveCases;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
