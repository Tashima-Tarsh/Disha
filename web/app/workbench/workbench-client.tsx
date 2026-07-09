"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Database,
  Download,
  FileText,
  GitBranch,
  Landmark,
  Layers3,
  Loader2,
  LockKeyhole,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  buildEvidenceChain,
  evaluatePolicy,
  EXAMPLE_MISSIONS,
  executeLens,
  fuseLensResults,
  normalizeMission,
  recommendLenses,
  type EvidenceNode,
  type FusionResult,
  type LensExecution,
  type LensId,
  type LensRecommendation,
  type PolicyResult,
  type StageStatus,
  type WorkbenchSignal,
} from "./demo-engine";
import styles from "./workbench.module.css";

type FlowStageId = "mission" | "signal" | "routing" | "execution" | "fusion" | "policy" | "ledger" | "report";

type FlowStage = {
  id: FlowStageId;
  label: string;
  status: StageStatus;
};

const DEFAULT_MISSION =
  "Assess a public-interest governance concern involving district infrastructure claims, CAG audit references, citizen complaints, and possible cyber-enabled fraud patterns. Produce a read-only evidence plan with policy gates and [VERIFY REQUIRED] markers.";

const DOMAINS = ["Constitutional accountability", "Public finance", "Cyber harm", "Disaster preparedness", "Administrative geography"];
const TAGS = ["Article 12", "CAG", "District", "Cyber", "NDMA", "Budget", "Citizen protection"];
const ALL_LENSES: LensId[] = ["governance", "strategy", "cyber", "geospatial", "yudh_view", "quantum"];

export function DishaWorkbench() {
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [tags, setTags] = useState<string[]>(["Article 12", "CAG", "District"]);
  const [signal, setSignal] = useState<WorkbenchSignal | null>(null);
  const [recommendations, setRecommendations] = useState<LensRecommendation[]>([]);
  const [selectedLenses, setSelectedLenses] = useState<LensId[]>([]);
  const [executions, setExecutions] = useState<LensExecution[]>([]);
  const [fusion, setFusion] = useState<FusionResult | null>(null);
  const [policy, setPolicy] = useState<PolicyResult | null>(null);
  const [ledger, setLedger] = useState<EvidenceNode[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [stages, setStages] = useState<FlowStage[]>(createInitialStages());

  const previewSignal = useMemo(() => normalizeMission(mission, domain, tags), [mission, domain, tags]);
  const activeRecommendations = recommendations.length ? recommendations : recommendLenses(previewSignal);
  const selectedRecommendationObjects = activeRecommendations.filter((item) => selectedLenses.includes(item.id));
  const finalReport = useMemo(
    () => buildReport(signal, executions, fusion, policy, ledger),
    [signal, executions, fusion, policy, ledger],
  );

  function setStage(id: FlowStageId, status: StageStatus) {
    setStages((current) => current.map((stage) => (stage.id === id ? { ...stage, status } : stage)));
  }

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  function toggleLens(lens: LensId) {
    setSelectedLenses((current) => (current.includes(lens) ? current.filter((item) => item !== lens) : [...current, lens]));
  }

  async function runMission() {
    setRunning(true);
    setConfirmed(false);
    setReportReady(false);
    setSaved(false);
    setStages(createInitialStages());
    setExecutions([]);
    setFusion(null);
    setPolicy(null);
    setLedger([]);

    setStage("mission", "complete");
    setStage("signal", "active");
    await wait(450);
    const normalized = normalizeMission(mission, domain, tags);
    setSignal(normalized);
    setStage("signal", "complete");

    setStage("routing", "active");
    await wait(450);
    const routed = recommendLenses(normalized);
    setRecommendations(routed);
    const defaults = selectedLenses.length ? selectedLenses : routed.filter((item) => item.selectedByDefault).map((item) => item.id);
    setSelectedLenses(defaults);
    setStage("routing", "complete");

    setStage("execution", "active");
    const runnable = routed.filter((item) => defaults.includes(item.id));
    const partial: LensExecution[] = [];
    for (const lens of runnable) {
      partial.push({ ...lens, status: "active", findings: [] });
      setExecutions([...partial]);
      await wait(420);
      partial[partial.length - 1] = executeLens(normalized, lens);
      setExecutions([...partial]);
    }
    setStage("execution", "complete");

    setStage("fusion", "active");
    await wait(400);
    const fused = fuseLensResults(partial);
    setFusion(fused);
    setStage("fusion", "complete");

    setStage("policy", "active");
    await wait(360);
    const policyResult = evaluatePolicy(normalized, partial);
    setPolicy(policyResult);
    setStage("policy", "complete");

    setStage("ledger", "active");
    await wait(350);
    setLedger(buildEvidenceChain(normalized, partial, policyResult));
    setStage("ledger", "complete");

    setStage("report", "active");
    await wait(250);
    setReportReady(true);
    setStage("report", "complete");
    setRunning(false);
  }

  async function copyReport() {
    await navigator.clipboard.writeText(finalReport);
  }

  function downloadJson() {
    const payload = JSON.stringify({ signal, executions, fusion, policy, ledger, generatedAt: new Date().toISOString() }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${signal?.missionId ?? "disha-mission"}-demo-ledger.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function saveToLedger() {
    setSaved(true);
  }

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>DISHA 6.6 Agentic Workbench</p>
          <h1>Run a constitutional intelligence mission and see every decision path.</h1>
          <p className={styles.heroText}>
            Demo mode turns a mission into a structured signal, routes lenses, fuses findings, evaluates policy, and builds a visible evidence
            chain. It is designed for later backend connection without hiding the reasoning from the analyst.
          </p>
        </div>
        <div className={styles.heroPanel} aria-label="Workbench status">
          <span>Mode</span>
          <strong>Safe read-only demo</strong>
          <small>No live claim is asserted without source evidence.</small>
        </div>
      </section>

      <section className={styles.layout}>
        <aside className={styles.stepper} aria-label="Mission flow stages">
          {stages.map((stage, index) => (
            <div className={styles.step} data-status={stage.status} key={stage.id}>
              <span className={styles.stepIndex}>{index + 1}</span>
              <span>{stage.label}</span>
            </div>
          ))}
        </aside>

        <div className={styles.workspace}>
          <section className={styles.panel}>
            <PanelTitle icon={<Landmark size={18} />} title="1. Mission Input" subtitle="Write the mission as a human analyst would frame it." />
            <textarea
              className={styles.textarea}
              value={mission}
              onChange={(event) => setMission(event.target.value)}
              placeholder="Describe the mission, scope, public sources, constitutional concern, and intended read-only output."
            />
            <div className={styles.controls}>
              <label>
                Domain
                <select value={domain} onChange={(event) => setDomain(event.target.value)}>
                  {DOMAINS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <div className={styles.tagCloud} aria-label="Mission tags">
                {TAGS.map((tag) => (
                  <button className={styles.tag} data-selected={tags.includes(tag)} key={tag} onClick={() => toggleTag(tag)} type="button">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.examples}>
              {EXAMPLE_MISSIONS.map((example) => (
                <button key={example.title} onClick={() => setMission(example.text)} type="button">
                  {example.title}
                </button>
              ))}
            </div>
            <button className={styles.primaryButton} disabled={running || mission.trim().length < 20} onClick={runMission} type="button">
              {running ? <Loader2 className={styles.spin} size={17} /> : <Play size={17} />}
              Run DISHA mission
            </button>
          </section>

          <section className={styles.panel}>
            <PanelTitle icon={<Sparkles size={18} />} title="2. Signal Normalization" subtitle="Raw mission text becomes a structured DishaSignal." />
            <div className={styles.transform}>
              <div>
                <span>Raw mission</span>
                <p>{mission.slice(0, 190)}{mission.length > 190 ? "..." : ""}</p>
              </div>
              <div className={styles.arrow}>→</div>
              <div>
                <span>Structured signal</span>
                <code>{(signal ?? previewSignal).id}</code>
                <p>{(signal ?? previewSignal).intent}</p>
              </div>
            </div>
            <div className={styles.kpiGrid}>
              <Metric label="Sensitivity" value={(signal ?? previewSignal).sensitivity} score={(signal ?? previewSignal).sensitivityScore} />
              <Metric label="Risk" value={(signal ?? previewSignal).riskLevel} score={(signal ?? previewSignal).riskScore} />
              <Metric label="Entities" value={`${(signal ?? previewSignal).entities.length}`} detail={(signal ?? previewSignal).entities.join(", ")} />
            </div>
          </section>

          <section className={styles.panel}>
            <PanelTitle icon={<Layers3 size={18} />} title="3. Lens Selection & Routing" subtitle="Recommended lenses stay under analyst control." />
            <div className={styles.lensGrid}>
              {ALL_LENSES.map((lens) => {
                const item = activeRecommendations.find((candidate) => candidate.id === lens) ?? fallbackLens(lens);
                const selected = selectedLenses.length ? selectedLenses.includes(lens) : item.selectedByDefault;
                return (
                  <button className={styles.lensCard} data-selected={selected} key={lens} onClick={() => toggleLens(lens)} type="button">
                    <strong>{item.label}</strong>
                    <span>{Math.round(item.confidence * 100)}% route confidence</span>
                    <p>{item.reason}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.panel}>
            <PanelTitle icon={<ShieldCheck size={18} />} title="4. Lens Execution" subtitle="Each lens exposes findings, uncertainty, evidence, and safe actions." />
            <div className={styles.resultStack}>
              {(executions.length ? executions : selectedRecommendationObjects).map((item) => {
                const execution = executions.find((result) => result.id === item.id) ?? null;
                const isOpen = expanded[item.id] ?? true;
                return (
                  <article className={styles.resultCard} key={item.id}>
                    <button
                      className={styles.resultHeader}
                      onClick={() => setExpanded((current) => ({ ...current, [item.id]: !isOpen }))}
                      type="button"
                    >
                      <span>
                        <strong>{item.label}</strong>
                        <small>{execution?.status === "active" ? "Running" : execution ? "Complete" : "Queued"}</small>
                      </span>
                      {execution?.status === "active" ? <Loader2 className={styles.spin} size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {isOpen && (
                      <div className={styles.resultBody}>
                        {execution?.findings.length ? (
                          execution.findings.map((finding) => (
                            <div className={styles.finding} key={finding.id}>
                              <strong>{finding.title}</strong>
                              <p>{finding.description}</p>
                              <div className={styles.metaRow}>
                                <span>Confidence {Math.round(finding.confidence * 100)}%</span>
                                <span>{finding.uncertainty}</span>
                              </div>
                              <ul>
                                {finding.evidence.map((evidence) => (
                                  <li key={evidence}>{evidence}</li>
                                ))}
                              </ul>
                            </div>
                          ))
                        ) : (
                          <p className={styles.empty}>Run the mission to execute this lens.</p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.twoColumn}>
            <div className={styles.panel}>
              <PanelTitle icon={<GitBranch size={18} />} title="5. Fusion Stage" subtitle="Agreements, conflicts, and synthesized insight." />
              {fusion ? <FusionView fusion={fusion} /> : <EmptyState text="Fusion appears after lens execution completes." />}
            </div>
            <div className={styles.panel}>
              <PanelTitle icon={<LockKeyhole size={18} />} title="6. Policy Gate" subtitle="Allowed output is explicit and reviewable." />
              {policy ? (
                <div className={styles.policyBox} data-decision={policy.decision}>
                  <strong>{policy.decision}</strong>
                  {policy.reasons.map((reason) => (
                    <p key={reason}>{reason}</p>
                  ))}
                  <label className={styles.confirm}>
                    <input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
                    {policy.requiredHumanStep}
                  </label>
                </div>
              ) : (
                <EmptyState text="Policy evaluation waits for fused findings." />
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <PanelTitle icon={<Database size={18} />} title="7. Evidence Ledger" subtitle="A visible demo hash chain for provenance review." />
            {ledger.length ? (
              <div className={styles.ledger}>
                {ledger.map((node) => (
                  <div className={styles.ledgerNode} key={node.id}>
                    <span>{node.id}</span>
                    <strong>{node.action}</strong>
                    <small>{node.label}</small>
                    <code>{node.hash}</code>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Ledger nodes are created as the mission progresses." />
            )}
          </section>

          <section className={styles.panel}>
            <PanelTitle icon={<FileText size={18} />} title="8. Final Report + Export" subtitle="Readable output with explicit demo/source limits." />
            {reportReady ? (
              <>
                <pre className={styles.report}>{finalReport}</pre>
                <div className={styles.exportRow}>
                  <button onClick={copyReport} type="button"><Clipboard size={16} /> Copy</button>
                  <button onClick={downloadJson} type="button"><Download size={16} /> JSON</button>
                  <button onClick={() => window.print()} type="button"><FileText size={16} /> PDF / Print</button>
                  <button disabled={!confirmed || saved} onClick={saveToLedger} type="button">
                    <CheckCircle2 size={16} /> {saved ? "Saved to demo ledger" : "Save to Ledger"}
                  </button>
                </div>
              </>
            ) : (
              <EmptyState text="The final report is generated after policy and ledger stages complete." />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function PanelTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <header className={styles.panelTitle}>
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function Metric({ label, value, score, detail }: { label: string; value: string; score?: number; detail?: string }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
      {typeof score === "number" ? <div className={styles.bar}><i style={{ width: `${Math.round(score * 100)}%` }} /></div> : null}
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function FusionView({ fusion }: { fusion: FusionResult }) {
  return (
    <div className={styles.fusion}>
      <ListBlock title="Agreements" items={fusion.agreements} icon={<CheckCircle2 size={15} />} />
      <ListBlock title="Conflicts" items={fusion.conflicts} icon={<AlertTriangle size={15} />} />
      <ListBlock title="Synthesis" items={fusion.synthesis} icon={<GitBranch size={15} />} />
    </div>
  );
}

function ListBlock({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div>
      <h3>{icon}{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className={styles.empty}>{text}</p>;
}

function createInitialStages(): FlowStage[] {
  return [
    { id: "mission", label: "Mission Input", status: "active" },
    { id: "signal", label: "Signal Normalization", status: "waiting" },
    { id: "routing", label: "Lens Routing", status: "waiting" },
    { id: "execution", label: "Lens Execution", status: "waiting" },
    { id: "fusion", label: "Fusion", status: "waiting" },
    { id: "policy", label: "Policy Gate", status: "waiting" },
    { id: "ledger", label: "Evidence Ledger", status: "waiting" },
    { id: "report", label: "Final Report", status: "waiting" },
  ];
}

function fallbackLens(id: LensId): LensRecommendation {
  const labels: Record<LensId, string> = {
    governance: "Governance Lens",
    strategy: "Strategy Lens",
    cyber: "Cyber Lens",
    geospatial: "Geospatial Lens",
    yudh_view: "Yudh View",
    quantum: "Simulation Lens",
  };
  return {
    id,
    label: labels[id],
    reason: "Available for analyst selection when the mission scope requires it.",
    confidence: 0.52,
    selectedByDefault: false,
  };
}

function buildReport(
  signal: WorkbenchSignal | null,
  executions: LensExecution[],
  fusion: FusionResult | null,
  policy: PolicyResult | null,
  ledger: EvidenceNode[],
): string {
  if (!signal || !fusion || !policy) return "Report not ready.";
  return [
    "DISHA 6.6 Mission Report (Demo Mode)",
    `Mission: ${signal.missionId}`,
    `Intent: ${signal.intent}`,
    `Sensitivity: ${signal.sensitivity} (${Math.round(signal.sensitivityScore * 100)}%)`,
    `Risk: ${signal.riskLevel} (${Math.round(signal.riskScore * 100)}%)`,
    `Entities: ${signal.entities.join(", ")}`,
    "",
    "Lens Findings:",
    ...executions.flatMap((execution) => execution.findings.map((finding) => `- ${execution.label}: ${finding.title}. ${finding.description}`)),
    "",
    "Fusion:",
    ...fusion.synthesis.map((item) => `- ${item}`),
    "",
    `Policy Decision: ${policy.decision}`,
    ...policy.reasons.map((reason) => `- ${reason}`),
    "",
    "Evidence Chain:",
    ...ledger.map((node) => `- ${node.id} ${node.action} hash=${node.hash} previous=${node.previousHash}`),
    "",
    "Source notice: demo mode uses generated, non-factual evidence markers. Live mode must attach verified source records before publishing claims.",
  ].join("\n");
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
