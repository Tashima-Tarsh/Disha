"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileSearch,
  Filter,
  Gavel,
  Landmark,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import styles from "./dashboard.module.css";

type Region = "North" | "South" | "East" | "West" | "Central" | "North East";
type TerritoryKind = "State" | "Union Territory";
type Priority = "Critical" | "High" | "Watch" | "Stable";
type Domain = "Constitutional" | "Service" | "Resilience" | "Evidence";

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

const regions: Array<"All India" | Region> = [
  "All India",
  "North",
  "South",
  "East",
  "West",
  "Central",
  "North East",
];

const domains: Array<"All domains" | Domain> = [
  "All domains",
  "Constitutional",
  "Service",
  "Resilience",
  "Evidence",
];

const priorities: Array<"All priorities" | Priority> = [
  "All priorities",
  "Critical",
  "High",
  "Watch",
  "Stable",
];

const domainMeta: Record<Domain, { icon: LucideIcon; label: string }> = {
  Constitutional: { icon: Landmark, label: "Constitutional audit" },
  Service: { icon: ClipboardList, label: "Service-gap protection" },
  Resilience: { icon: Route, label: "Infrastructure resilience" },
  Evidence: { icon: FileSearch, label: "Evidence verification" },
};

export default function DashboardPage() {
  const [selectedRegion, setSelectedRegion] = useState<(typeof regions)[number]>("All India");
  const [selectedDomain, setSelectedDomain] = useState<(typeof domains)[number]>("All domains");
  const [selectedPriority, setSelectedPriority] = useState<(typeof priorities)[number]>("All priorities");

  const filtered = useMemo(
    () =>
      territories.filter((territory) => {
        const regionMatch = selectedRegion === "All India" || territory.region === selectedRegion;
        const domainMatch = selectedDomain === "All domains" || territory.domain === selectedDomain;
        const priorityMatch = selectedPriority === "All priorities" || territory.priority === selectedPriority;
        return regionMatch && domainMatch && priorityMatch;
      }),
    [selectedDomain, selectedPriority, selectedRegion],
  );

  const totalCases = filtered.reduce((sum, territory) => sum + territory.cases, 0);
  const approvalQueue = filtered.reduce((sum, territory) => sum + territory.approval, 0);
  const averageEvidence = Math.round(
    filtered.reduce((sum, territory) => sum + territory.evidence, 0) / Math.max(filtered.length, 1),
  );
  const criticalCount = filtered.filter((territory) => territory.priority === "Critical").length;
  const leadTerritory = [...filtered].sort((a, b) => b.cases - a.cases)[0];
  const regionRows = summarizeByRegion(filtered);
  const domainRows = summarizeByDomain(filtered);

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="dashboard-title">
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>DISHA Bharat Operations View</p>
            <h1 id="dashboard-title">Constitutional audit and public protection across India</h1>
            <p>
              A civic command view for source-linked public evidence, service gaps,
              resilience risk, and lawful action. The screen is demo operational
              data only; it is not a government claim.
            </p>
          </div>
          <div className={styles.heroPanel}>
            <div>
              <Sparkles aria-hidden="true" />
              <span>Active lens</span>
            </div>
            <strong>{selectedRegion}</strong>
            <p>
              {filtered.length} states and union territories in view. Every tile
              keeps weak evidence away from public truth until review is complete.
            </p>
          </div>
        </header>

        <section className={styles.filterBar} aria-label="Dashboard filters">
          <div className={styles.filterTitle}>
            <Filter aria-hidden="true" />
            <span>Filters</span>
          </div>
          <SelectControl label="Region" value={selectedRegion} values={regions} onChange={setSelectedRegion} />
          <SelectControl label="Domain" value={selectedDomain} values={domains} onChange={setSelectedDomain} />
          <SelectControl label="Priority" value={selectedPriority} values={priorities} onChange={setSelectedPriority} />
        </section>

        <section className={styles.kpiGrid} aria-label="All India indicators">
          <Kpi label="Territories in view" value={String(filtered.length)} detail="states and union territories" icon={MapPinned} />
          <Kpi label="Public-interest cases" value={String(totalCases)} detail="source-linked work items" icon={ClipboardList} />
          <Kpi label="Evidence readiness" value={`${averageEvidence}%`} detail="demo confidence average" icon={CheckCircle2} />
          <Kpi label="Human approval queue" value={String(approvalQueue)} detail="policy-gated actions" icon={Gavel} />
          <Kpi label="Critical territories" value={String(criticalCount)} detail="needs senior review" icon={AlertTriangle} />
        </section>

        <section className={styles.mapGrid}>
          <article className={styles.atlasPanel}>
            <PanelHeader icon={MapPinned} eyebrow="India coverage board" title="All states and union territories" />
            <div className={styles.territoryGrid}>
              {filtered.map((territory) => {
                const Icon = domainMeta[territory.domain].icon;
                return (
                  <button className={`${styles.territoryCard} ${styles[territory.priority.toLowerCase()]}`} type="button" key={territory.name}>
                    <div>
                      <Icon aria-hidden="true" />
                      <span>{territory.kind}</span>
                    </div>
                    <strong>{territory.name}</strong>
                    <p>{territory.note}</p>
                    <small>{territory.cases} cases | {territory.evidence}% evidence</small>
                  </button>
                );
              })}
            </div>
          </article>

          <aside className={styles.contextPanel}>
            <PanelHeader icon={ShieldCheck} eyebrow="Action discipline" title="What the product protects" />
            <div className={styles.protectionStack}>
              <Protection label="No individual surveillance" text="Only aggregate, source-linked, consented, or authorized evidence belongs here." />
              <Protection label="No unsupported public claim" text="Unverified findings remain review work until sources can support them." />
              <Protection label="No retaliation" text="Defensive action stays inside lawful public-interest and authorized boundaries." />
            </div>
            <div className={styles.leadBox}>
              <span>Highest current load</span>
              <strong>{leadTerritory?.name ?? "No territory"}</strong>
              <p>{leadTerritory ? `${leadTerritory.cases} demo cases in ${domainMeta[leadTerritory.domain].label.toLowerCase()}.` : "Adjust filters to restore a view."}</p>
            </div>
          </aside>
        </section>

        <section className={styles.analyticsGrid}>
          <article className={styles.panel}>
            <PanelHeader icon={Landmark} eyebrow="Regional posture" title="Cases by zone" />
            <div className={styles.barList}>
              {regionRows.map((row) => (
                <div className={styles.barRow} key={row.region}>
                  <span>{row.region}</span>
                  <strong>{row.cases}</strong>
                  <div><i style={{ width: `${Math.max(row.cases, 4)}%` }} /></div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <PanelHeader icon={FileSearch} eyebrow="Problem domains" title="Where attention is going" />
            <div className={styles.domainList}>
              {domainRows.map((row) => {
                const Icon = domainMeta[row.domain].icon;
                return (
                  <div key={row.domain}>
                    <Icon aria-hidden="true" />
                    <span>{domainMeta[row.domain].label}</span>
                    <strong>{row.cases}</strong>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function SelectControl<T extends string>({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: T;
  values: readonly T[];
  onChange: (value: T) => void;
}) {
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

function Protection({ label, text }: { label: string; text: string }) {
  return (
    <div className={styles.protection}>
      <span>{label}</span>
      <p>{text}</p>
    </div>
  );
}

function summarizeByRegion(items: Territory[]) {
  return regions
    .filter((region): region is Region => region !== "All India")
    .map((region) => ({
      region,
      cases: items.filter((item) => item.region === region).reduce((sum, item) => sum + item.cases, 0),
    }))
    .filter((row) => row.cases > 0);
}

function summarizeByDomain(items: Territory[]) {
  return (Object.keys(domainMeta) as Domain[])
    .map((domain) => ({
      domain,
      cases: items.filter((item) => item.domain === domain).reduce((sum, item) => sum + item.cases, 0),
    }))
    .filter((row) => row.cases > 0);
}
