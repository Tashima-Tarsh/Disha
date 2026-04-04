"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BookOpenText, Eye, FlaskConical, Wand2, X } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { useNotificationStore } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type ResearchSection = "orchestrate" | "retrieve" | "log-slim" | "screen-review";

type RolePlan = {
  role: string;
  objective: string;
  findings: string[];
  next_actions: string[];
  artifacts: Array<{
    kind: string;
    title: string;
    body: string;
    review_gate: string;
  }>;
};

const SECTION_META: Record<ResearchSection, { label: string; icon: React.ElementType }> = {
  orchestrate: { label: "Orchestrate", icon: Wand2 },
  retrieve: { label: "ISA-95 Retrieval", icon: BookOpenText },
  "log-slim": { label: "Log Slimming", icon: FlaskConical },
  "screen-review": { label: "HMI Review", icon: Eye },
};

const DEFAULT_LOG_SAMPLE = [
  "2026-04-03T08:00:01Z LINE1 ALARM 42 ACTIVE",
  "2026-04-03T08:00:02Z LINE1 ALARM 42 ACTIVE",
  "2026-04-03T08:00:03Z Batch=42 started by operator=anne",
  "2026-04-03T08:00:04Z LINE1 ALARM 42 ACTIVE",
  "2026-04-03T08:00:05Z Batch=42 started by operator=anne",
].join("\n");

const DEFAULT_SCREEN_NOTES = "Alarm banner visible. Manual mode lit. Batch 42 recipe screen open with release hold indicator.";

export function ResearchWorkbench() {
  const { researchOpen, closeResearch } = useChatStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeSection, setActiveSection] = useState<ResearchSection>("orchestrate");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orchestratePrompt, setOrchestratePrompt] = useState("Review the MES release flow for operator approvals and genealogy capture.");
  const [orchestrateResponse, setOrchestrateResponse] = useState<null | {
    summary: string;
    findings: string[];
    follow_up_actions: string[];
    role_plans: RolePlan[];
  }>(null);
  const [orchestrationHistory, setOrchestrationHistory] = useState<
    Array<{
      id: string;
      detail_id: string;
      created_at: string;
      prompt: string;
      provider: string;
      model: string;
      roles: string[];
      summary: string;
      artifact_count: number;
      requires_human_review: boolean;
    }>
  >([]);
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<null | {
    id: string;
    created_at: string;
    prompt: string;
    provider: string;
    model: string;
    roles: string[];
    summary: string;
    findings: string[];
    follow_up_actions: string[];
    role_plans: RolePlan[];
    requires_human_review: boolean;
  }>(null);

  const [retrieveQuery, setRetrieveQuery] = useState("material genealogy traceability");
  const [datasetCatalog, setDatasetCatalog] = useState<Array<{
    id: string;
    name: string;
    version: string;
    description: string;
    tags: string[];
  }>>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>(["isa95-core"]);
  const [retrieveResponse, setRetrieveResponse] = useState<null | {
    query: string;
    results: Array<{ source: string; title: string; excerpt: string; tags: string[] }>;
    datasets: Array<{ id: string; name: string; version: string; description: string; tags: string[] }>;
  }>(null);

  const [logText, setLogText] = useState(DEFAULT_LOG_SAMPLE);
  const [preserveTokens, setPreserveTokens] = useState("Batch=42, operator");
  const [logSlimResponse, setLogSlimResponse] = useState<null | {
    original_lines: number;
    kept_lines: number;
    text: string;
  }>(null);

  const [screenTitle, setScreenTitle] = useState("Mixer release screen");
  const [screenNotes, setScreenNotes] = useState(DEFAULT_SCREEN_NOTES);
  const [screenLabels, setScreenLabels] = useState("ALARM 42, MANUAL MODE, Batch 42, Release Hold");
  const [screenImageName, setScreenImageName] = useState("");
  const [screenImageDataUrl, setScreenImageDataUrl] = useState("");
  const [screenResponse, setScreenResponse] = useState<null | {
    summary: string;
    adapter: string;
    observations: string[];
    risks: string[];
    recommended_follow_up: string[];
  }>(null);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/orchestration/history?limit=6");
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = await response.json();
      setOrchestrationHistory(payload.items ?? []);
    } catch {
      setOrchestrationHistory([]);
    }
  }, []);

  const loadDatasetCatalog = useCallback(async () => {
    try {
      const response = await fetch("/api/mes/datasets");
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = await response.json();
      setDatasetCatalog(payload.items ?? []);
    } catch {
      setDatasetCatalog([]);
    }
  }, []);

  const loadHistoryDetail = useCallback(async (detailId: string) => {
    try {
      const response = await fetch(`/api/orchestration/history/${encodeURIComponent(detailId)}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = await response.json();
      setSelectedHistoryDetail(payload);
    } catch {
      setSelectedHistoryDetail(null);
    }
  }, []);

  useEffect(() => {
    if (researchOpen) {
      void loadHistory();
      void loadDatasetCatalog();
    }
  }, [loadDatasetCatalog, loadHistory, researchOpen]);

  const handleScreenFileChange = useCallback(async (file: File | null) => {
    if (!file) {
      setScreenImageName("");
      setScreenImageDataUrl("");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    setScreenImageName(file.name);
    setScreenImageDataUrl(dataUrl);
  }, []);

  const content = useMemo(() => {
    if (activeSection === "orchestrate") {
      return (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-200">Research prompt</label>
            <textarea
              value={orchestratePrompt}
              onChange={(event) => setOrchestratePrompt(event.target.value)}
              rows={5}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const response = await fetch("/api/orchestrate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    prompt: orchestratePrompt,
                    provider: "ollama",
                    model: "qwen2.5-coder:7b",
                    roles: ["plc-analyst", "devops", "safety"],
                    context: {
                      workspace_root: "D:/OneDrive - AG SOLUTION/claude-code",
                      project_name: "ag-claw",
                      safety_mode: "advisory-only",
                    },
                  }),
                });
                if (!response.ok) {
                  throw new Error(await response.text());
                }
                const payload = await response.json();
                setOrchestrateResponse(payload);
                setSelectedHistoryDetail(null);
                await loadHistory();
                addNotification({
                  title: "Research orchestration complete",
                  description: "Swarm role guidance is ready for review.",
                  category: "activity",
                });
              } catch (error) {
                addNotification({
                  title: "Research orchestration failed",
                  description: error instanceof Error ? error.message : "Unknown error",
                  category: "error",
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-surface-500"
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Running..." : "Run orchestration"}
          </button>
          {orchestrateResponse && (
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                <div className="font-medium text-surface-100">{orchestrateResponse.summary}</div>
                <ul className="mt-3 space-y-2 text-surface-300">
                  {orchestrateResponse.findings.map((finding) => (
                    <li key={finding}>- {finding}</li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {orchestrateResponse.role_plans.map((plan) => (
                  <div key={plan.role} className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                    <div className="font-medium capitalize text-surface-100">{plan.role.replace(/-/g, " ")}</div>
                    <p className="mt-2 text-surface-400">{plan.objective}</p>
                    <div className="mt-3 text-xs uppercase tracking-wide text-surface-500">Findings</div>
                    <ul className="mt-2 space-y-2 text-surface-300">
                      {plan.findings.map((finding) => (
                        <li key={finding}>- {finding}</li>
                      ))}
                    </ul>
                    <div className="mt-3 text-xs uppercase tracking-wide text-surface-500">Next actions</div>
                    <ul className="mt-2 space-y-2 text-surface-300">
                      {plan.next_actions.map((action) => (
                        <li key={action}>- {action}</li>
                      ))}
                    </ul>
                    <div className="mt-3 text-xs uppercase tracking-wide text-surface-500">Artifacts</div>
                    <div className="mt-2 space-y-2">
                      {plan.artifacts.map((artifact) => (
                        <div key={`${plan.role}-${artifact.title}`} className="rounded-md border border-surface-800 bg-surface-950/80 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium text-surface-200">{artifact.title}</div>
                            <span className="rounded-full border border-surface-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-surface-400">
                              {artifact.kind}
                            </span>
                          </div>
                          <p className="mt-2 text-surface-400">{artifact.body}</p>
                          <div className="mt-2 text-[10px] uppercase tracking-wide text-amber-300">
                            {artifact.review_gate}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                <div className="mb-3 text-xs uppercase tracking-wide text-surface-500">Recent orchestration runs</div>
                <div className="space-y-3">
                  {orchestrationHistory.length === 0 ? (
                    <div className="text-surface-500">No persisted orchestration history yet.</div>
                  ) : (
                    orchestrationHistory.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => void loadHistoryDetail(item.detail_id || item.id)}
                        className="w-full rounded-md border border-surface-800 bg-surface-950/80 p-3 text-left transition-colors hover:border-surface-700"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-surface-500">
                          <span>{new Date(item.created_at).toLocaleString()}</span>
                          <span>{item.provider}</span>
                          <span>{item.model}</span>
                          <span>{item.artifact_count} artifacts</span>
                        </div>
                        <div className="mt-2 font-medium text-surface-200">{item.summary}</div>
                        <p className="mt-1 text-surface-400">{item.prompt}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
              {selectedHistoryDetail && (
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-surface-500">Persisted orchestration detail</div>
                      <div className="mt-1 font-medium text-surface-100">{selectedHistoryDetail.summary}</div>
                    </div>
                    <button
                      onClick={() => setSelectedHistoryDetail(null)}
                      className="rounded-md border border-surface-700 px-3 py-1 text-xs text-surface-300 hover:bg-surface-800 hover:text-surface-100"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-surface-500">Prompt</div>
                      <p className="mt-2 text-surface-300">{selectedHistoryDetail.prompt}</p>
                      <div className="mt-4 text-xs uppercase tracking-wide text-surface-500">Follow-up actions</div>
                      <ul className="mt-2 space-y-2 text-surface-300">
                        {selectedHistoryDetail.follow_up_actions.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-surface-500">Persisted findings</div>
                      <ul className="mt-2 space-y-2 text-surface-300">
                        {selectedHistoryDetail.findings.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (activeSection === "retrieve") {
      return (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-200">Query</label>
            <input
              value={retrieveQuery}
              onChange={(event) => setRetrieveQuery(event.target.value)}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            />
          </div>
          {datasetCatalog.length > 0 && (
            <div>
              <div className="mb-2 block text-sm font-medium text-surface-200">Datasets</div>
              <div className="grid gap-2 md:grid-cols-2">
                {datasetCatalog.map((dataset) => {
                  const checked = selectedDatasetIds.includes(dataset.id);
                  return (
                    <label
                      key={dataset.id}
                      className="flex cursor-pointer gap-3 rounded-md border border-surface-800 bg-surface-900/70 p-3 text-sm text-surface-200"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedDatasetIds((current) =>
                            checked ? current.filter((item) => item !== dataset.id) : [...current, dataset.id]
                          );
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-surface-100">{dataset.name}</div>
                        <div className="mt-1 text-xs text-surface-500">{dataset.version}</div>
                        <p className="mt-2 text-xs text-surface-400">{dataset.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <button
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const response = await fetch("/api/mes/retrieve", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    query: retrieveQuery,
                    domains: ["isa-95"],
                    limit: 5,
                    dataset_ids: selectedDatasetIds,
                  }),
                });
                if (!response.ok) {
                  throw new Error(await response.text());
                }
                const payload = await response.json();
                setRetrieveResponse(payload);
                addNotification({
                  title: "MES retrieval complete",
                  description: "ISA-95 research references are ready.",
                  category: "activity",
                });
              } catch (error) {
                addNotification({
                  title: "MES retrieval failed",
                  description: error instanceof Error ? error.message : "Unknown error",
                  category: "error",
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-surface-500"
          >
            <BookOpenText className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Searching..." : "Retrieve research"}
          </button>
          {retrieveResponse && (
            <div className="space-y-3">
              {retrieveResponse.datasets.length > 0 && (
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="mb-3 text-xs uppercase tracking-wide text-surface-500">Datasets used</div>
                  <div className="flex flex-wrap gap-2">
                    {retrieveResponse.datasets.map((dataset) => (
                      <span key={dataset.id} className="rounded-full border border-surface-700 px-2 py-0.5 text-xs text-surface-400">
                        {dataset.name} {dataset.version}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {retrieveResponse.results.map((result) => (
                <div key={`${result.source}-${result.title}`} className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="font-medium text-surface-100">{result.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-surface-500">{result.source}</div>
                  <p className="mt-3 text-surface-300">{result.excerpt}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-surface-700 px-2 py-0.5 text-xs text-surface-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeSection === "screen-review") {
      return (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-200">Screen title</label>
            <input
              value={screenTitle}
              onChange={(event) => setScreenTitle(event.target.value)}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-200">Screenshot notes / OCR text</label>
            <textarea
              value={screenNotes}
              onChange={(event) => setScreenNotes(event.target.value)}
              rows={5}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-200">Visible labels</label>
            <input
              value={screenLabels}
              onChange={(event) => setScreenLabels(event.target.value)}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-200">Optional screenshot</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                try {
                  await handleScreenFileChange(event.target.files?.[0] ?? null);
                } catch (error) {
                  addNotification({
                    title: "Screenshot load failed",
                    description: error instanceof Error ? error.message : "Unknown error",
                    category: "error",
                  });
                }
              }}
              className="block w-full text-sm text-surface-300 file:mr-4 file:rounded-md file:border-0 file:bg-surface-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-surface-100 hover:file:bg-surface-700"
            />
            {screenImageName && (
              <div className="mt-2 text-xs text-surface-500">Attached: {screenImageName}</div>
            )}
          </div>
          <button
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const response = await fetch("/api/mes/interpret-screen", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: screenTitle,
                    notes: screenNotes,
                    visible_labels: screenLabels.split(",").map((value) => value.trim()).filter(Boolean),
                    image_name: screenImageName,
                    image_data_url: screenImageDataUrl,
                  }),
                });
                if (!response.ok) {
                  throw new Error(await response.text());
                }
                const payload = await response.json();
                setScreenResponse(payload);
                addNotification({
                  title: "HMI review complete",
                  description: "Screen observations are ready for review.",
                  category: "activity",
                });
              } catch (error) {
                addNotification({
                  title: "HMI review failed",
                  description: error instanceof Error ? error.message : "Unknown error",
                  category: "error",
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-surface-500"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Reviewing..." : "Interpret screen"}
          </button>
          {screenResponse && (
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                <div className="font-medium text-surface-100">{screenResponse.summary}</div>
                <div className="mt-2 text-xs uppercase tracking-wide text-surface-500">Adapter: {screenResponse.adapter}</div>
              </div>
              {screenImageDataUrl && (
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="mb-3 text-xs uppercase tracking-wide text-surface-500">Attached screenshot</div>
                  <Image
                    src={screenImageDataUrl}
                    alt={screenImageName || "Uploaded HMI screenshot"}
                    width={640}
                    height={360}
                    unoptimized
                    className="max-h-72 w-auto rounded-md border border-surface-800 object-contain"
                  />
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Observations</div>
                  <ul className="mt-2 space-y-2 text-surface-300">
                    {screenResponse.observations.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Risks</div>
                  <ul className="mt-2 space-y-2 text-surface-300">
                    {screenResponse.risks.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Recommended follow-up</div>
                  <ul className="mt-2 space-y-2 text-surface-300">
                    {screenResponse.recommended_follow_up.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-surface-200">Raw industrial log</label>
          <textarea
            value={logText}
            onChange={(event) => setLogText(event.target.value)}
            rows={7}
            className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-surface-200">Preserve tokens</label>
          <input
            value={preserveTokens}
            onChange={(event) => setPreserveTokens(event.target.value)}
            className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
          />
        </div>
        <button
          onClick={async () => {
            setIsSubmitting(true);
            try {
              const response = await fetch("/api/mes/log-slim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: logText,
                  preserve_tokens: preserveTokens.split(",").map((value) => value.trim()).filter(Boolean),
                  max_lines: 4,
                }),
              });
              if (!response.ok) {
                throw new Error(await response.text());
              }
              const payload = await response.json();
              setLogSlimResponse(payload);
              addNotification({
                title: "Log slimming complete",
                description: "Noise-reduced industrial log is ready.",
                category: "activity",
              });
            } catch (error) {
              addNotification({
                title: "Log slimming failed",
                description: error instanceof Error ? error.message : "Unknown error",
                category: "error",
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-surface-500"
        >
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Slimming..." : "Slim log"}
        </button>
        {logSlimResponse && (
          <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
            <div className="mb-2 text-xs text-surface-500">
              {logSlimResponse.kept_lines} of {logSlimResponse.original_lines} lines kept
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-surface-950 p-3 text-xs text-surface-300">
              {logSlimResponse.text}
            </pre>
          </div>
        )}
      </div>
    );
  }, [activeSection, addNotification, datasetCatalog, handleScreenFileChange, isSubmitting, loadHistory, loadHistoryDetail, logSlimResponse, logText, orchestrationHistory, orchestratePrompt, orchestrateResponse, preserveTokens, retrieveQuery, retrieveResponse, screenImageDataUrl, screenImageName, screenLabels, screenNotes, screenResponse, screenTitle, selectedDatasetIds, selectedHistoryDetail]);

  if (!researchOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[min(48rem,92vh)] w-[min(76rem,100%)] overflow-hidden rounded-2xl border border-surface-800 bg-surface-950 shadow-2xl">
        <div className="flex w-64 flex-col border-r border-surface-800 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-surface-100">Research Workbench</h2>
              <p className="text-xs text-surface-500">Clean-room orchestration and MES analysis tools.</p>
            </div>
            <button
              onClick={closeResearch}
              className="rounded-md p-2 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200"
              aria-label="Close research workbench"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-2">
            {(Object.keys(SECTION_META) as ResearchSection[]).map((section) => {
              const Icon = SECTION_META[section].icon;
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    activeSection === section
                      ? "bg-surface-800 text-surface-100"
                      : "text-surface-400 hover:bg-surface-800/50 hover:text-surface-200"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {SECTION_META[section].label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto p-6">{content}</div>
      </div>
    </div>
  );
}
