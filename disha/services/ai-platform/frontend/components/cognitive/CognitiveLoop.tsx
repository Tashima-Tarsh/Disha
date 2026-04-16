"use client"

/**
 * CognitiveLoop — Real-time visualization of DISHA-MIND's 7-stage cognitive process.
 *
 * Connects to /ws/cognitive/stream/{session} and renders each stage as it executes,
 * giving the user a live view of the system's reasoning.
 */

import { useEffect, useRef, useState } from "react"

// ── Types ──────────────────────────────────────────────────────────────────────

type Stage =
  | "idle"
  | "perceiving"
  | "attending"
  | "reasoning"
  | "deliberating"
  | "acting"
  | "reflecting"
  | "consolidating"
  | "complete"
  | "error"

interface StageEvent {
  stage: Stage
  data: Record<string, unknown>
  timestamp: number
}

interface Hypothesis {
  mode: "deductive" | "inductive" | "abductive"
  hypothesis: string
  confidence: number
  chain_of_thought: string[]
}

interface AgentOpinion {
  recommendation: string
  confidence: number
  reasoning: string
  concerns: string[]
}

// ── Stage metadata ─────────────────────────────────────────────────────────────

const STAGE_META: Record<Stage, { label: string; color: string; description: string }> = {
  idle:          { label: "Idle",          color: "#4b5563", description: "Waiting for input" },
  perceiving:    { label: "Perceiving",    color: "#6366f1", description: "Extracting intent, entities, uncertainty" },
  attending:     { label: "Attending",     color: "#8b5cf6", description: "Gating working memory, retrieving episodic context" },
  reasoning:     { label: "Reasoning",     color: "#06b6d4", description: "Running deductive + inductive + abductive in parallel" },
  deliberating:  { label: "Deliberating", color: "#10b981", description: "Planner / Executor / Critic deliberation" },
  acting:        { label: "Acting",        color: "#f59e0b", description: "Confidence-weighted consensus → action" },
  reflecting:    { label: "Reflecting",   color: "#f97316", description: "Metacognitive self-evaluation" },
  consolidating: { label: "Consolidating",color: "#ec4899", description: "Promoting memories, updating semantic graph" },
  complete:      { label: "Complete",      color: "#22c55e", description: "Cognitive cycle finished" },
  error:         { label: "Error",         color: "#ef4444", description: "Processing failed" },
}

const STAGE_ORDER: Stage[] = [
  "perceiving", "attending", "reasoning", "deliberating",
  "acting", "reflecting", "consolidating", "complete",
]

// ── Component ──────────────────────────────────────────────────────────────────

export function CognitiveLoop({ sessionId }: { sessionId: string }) {
  const [currentStage, setCurrentStage] = useState<Stage>("idle")
  const [events, setEvents] = useState<StageEvent[]>([])
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [deliberation, setDeliberation] = useState<Record<string, AgentOpinion> | null>(null)
  const [reflection, setReflection] = useState<{ quality: number; triggers: string[] } | null>(null)
  const [memorySlots, setMemorySlots] = useState<{ content: string; relevance: number }[]>([])
  const [action, setAction] = useState<Record<string, unknown> | null>(null)
  const [input, setInput] = useState("")
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // Auto-scroll event log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [events])

  // Cleanup on unmount
  useEffect(() => {
    return () => { wsRef.current?.close() }
  }, [])

  function connect() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const wsBase = process.env.NEXT_PUBLIC_COGNITIVE_WS_URL || "ws://localhost:8001"
    const ws = new WebSocket(`${wsBase}/cognitive/stream/${sessionId}`)
    wsRef.current = ws

    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    ws.onmessage = (e) => {
      const event: StageEvent = { ...JSON.parse(e.data), timestamp: Date.now() }
      setCurrentStage(event.stage as Stage)
      setEvents((prev) => [...prev.slice(-49), event])

      const d = event.data
      if (event.stage === "reasoning"    && d.hypotheses)    setHypotheses(d.hypotheses as Hypothesis[])
      if (event.stage === "deliberating" && d.all_opinions)  setDeliberation(d.all_opinions as Record<string, AgentOpinion>)
      if (event.stage === "reflecting")                       setReflection({ quality: d.quality as number, triggers: d.triggers as string[] ?? [] })
      if (event.stage === "attending"    && d.working_memory) setMemorySlots(d.working_memory as { content: string; relevance: number }[])
      if (event.stage === "complete"     && d.action)         setAction(d.action as Record<string, unknown>)
    }
  }

  function sendInput() {
    if (!input.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ input, session_id: sessionId }))
    setInput("")
    setHypotheses([])
    setDeliberation(null)
    setReflection(null)
    setAction(null)
    setCurrentStage("perceiving")
  }

  const completedStages = new Set(events.map((e) => e.stage))

  return (
    <div className="min-h-full bg-gray-950 text-gray-100 font-mono space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">DISHA-MIND</h1>
          <p className="text-xs text-gray-500 mt-0.5">7-Stage Cognitive Loop · Session <span className="text-indigo-400">{sessionId}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
          <span className="text-xs text-gray-400">{connected ? "Connected" : "Disconnected"}</span>
          {!connected && (
            <button
              onClick={connect}
              className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className="grid grid-cols-8 gap-1">
        {STAGE_ORDER.map((stage, i) => {
          const meta = STAGE_META[stage]
          const isActive = currentStage === stage
          const isDone   = completedStages.has(stage) && currentStage !== stage
          return (
            <div
              key={stage}
              className={`relative rounded p-2 border transition-all duration-300 ${
                isActive ? "border-opacity-100 shadow-lg"
                : isDone  ? "border-gray-700 opacity-60"
                :           "border-gray-800 opacity-30"
              }`}
              style={isActive ? { borderColor: meta.color, boxShadow: `0 0 12px ${meta.color}40` } : {}}
            >
              <div
                className="text-xs font-bold mb-1"
                style={{ color: isActive ? meta.color : isDone ? "#6b7280" : "#374151" }}
              >
                {i + 1}. {meta.label}
              </div>
              <div className="text-gray-600 text-xs leading-tight hidden xl:block">{meta.description}</div>
              {isActive && (
                <div className="mt-2 h-0.5 rounded animate-pulse" style={{ backgroundColor: meta.color }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Working Memory */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-purple-400 mb-3 uppercase tracking-wider">
            Working Memory
            <span className="ml-2 text-gray-600 normal-case font-normal">(8-slot)</span>
          </h2>
          <div className="space-y-1.5">
            {Array.from({ length: 8 }).map((_, i) => {
              const slot = memorySlots[i]
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-700 text-xs w-4">{i + 1}</span>
                  <div className="flex-1 bg-gray-800 rounded h-6 overflow-hidden">
                    {slot && (
                      <div
                        className="h-full flex items-center px-2 text-xs text-gray-200 truncate transition-all duration-500"
                        style={{
                          width: `${Math.max(10, Math.round(slot.relevance * 100))}%`,
                          backgroundColor: `rgba(139, 92, 246, ${slot.relevance * 0.6 + 0.1})`,
                        }}
                      >
                        {slot.content}
                      </div>
                    )}
                  </div>
                  <span className="text-gray-600 text-xs w-8 text-right">
                    {slot ? Math.round(slot.relevance * 100) : "--"}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Reasoning Hypotheses */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">
            Parallel Hypotheses
          </h2>
          {hypotheses.length === 0 ? (
            <p className="text-gray-700 text-xs italic">Awaiting reasoning stage…</p>
          ) : (
            <div className="space-y-3">
              {hypotheses.map((h, idx) => (
                <div key={idx} className="border border-gray-800 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-bold capitalize"
                      style={{
                        color: h.mode === "deductive" ? "#06b6d4"
                             : h.mode === "inductive"  ? "#8b5cf6"
                             :                           "#f59e0b",
                      }}
                    >
                      {h.mode}
                    </span>
                    <span className="text-xs text-gray-400">{Math.round((h.confidence ?? 0) * 100)}%</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-snug">{h.hypothesis}</p>
                  {(h.chain_of_thought ?? []).length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {h.chain_of_thought.slice(0, 3).map((step, i) => (
                        <div key={i} className="text-gray-600 text-xs">
                          <span className="text-gray-700">{i + 1}.</span> {step}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Deliberation */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-green-400 mb-3 uppercase tracking-wider">
            Agent Deliberation
          </h2>
          {!deliberation ? (
            <p className="text-gray-700 text-xs italic">Awaiting deliberation stage…</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(deliberation).map(([agent, opinion]) => (
                <div key={agent} className="border border-gray-800 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-bold capitalize"
                      style={{
                        color: agent === "planner"  ? "#10b981"
                             : agent === "executor" ? "#f59e0b"
                             :                        "#f97316",
                      }}
                    >
                      {agent}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="bg-gray-800 rounded-full h-1 w-16 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((opinion.confidence ?? 0) * 100)}%`,
                            backgroundColor: agent === "planner"  ? "#10b981"
                                           : agent === "executor" ? "#f59e0b"
                                           :                        "#f97316",
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round((opinion.confidence ?? 0) * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 leading-snug">{opinion.recommendation}</p>
                  {(opinion.concerns ?? []).length > 0 && (
                    <div className="mt-1 text-xs text-red-400 opacity-70">
                      ⚠ {opinion.concerns[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reflection + Action row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Metacognitive Reflection */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-orange-400 mb-3 uppercase tracking-wider">
            Metacognitive Reflection
          </h2>
          {!reflection ? (
            <p className="text-gray-700 text-xs italic">Awaiting reflection stage…</p>
          ) : (
            <div className="flex items-start gap-6">
              <div>
                <div className="text-xs text-gray-500 mb-1">Reasoning Quality</div>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-800 rounded-full h-2 w-32 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(reflection.quality * 100)}%`,
                        backgroundColor: reflection.quality > 0.7 ? "#22c55e"
                                       : reflection.quality > 0.4 ? "#f59e0b"
                                       :                             "#ef4444",
                      }}
                    />
                  </div>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: reflection.quality > 0.7 ? "#22c55e"
                           : reflection.quality > 0.4 ? "#f59e0b"
                           :                             "#ef4444",
                    }}
                  >
                    {Math.round(reflection.quality * 100)}%
                  </span>
                </div>
              </div>
              {reflection.triggers.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Learning Triggers</div>
                  <div className="flex flex-wrap gap-1">
                    {reflection.triggers.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 bg-orange-900/40 text-orange-300 rounded text-xs border border-orange-800/40">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Final Action */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-yellow-400 mb-3 uppercase tracking-wider">
            Cognitive Output
          </h2>
          {!action ? (
            <p className="text-gray-700 text-xs italic">Awaiting cognitive cycle completion…</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                  style={{
                    backgroundColor: action.type === "clarification_request" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                    color: action.type === "clarification_request" ? "#ef4444" : "#22c55e",
                    border: `1px solid ${action.type === "clarification_request" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                  }}
                >
                  {String(action.type)}
                </span>
                <span className="text-xs text-gray-500">
                  confidence: <span className="text-gray-300">{Math.round(Number(action.confidence ?? 0) * 100)}%</span>
                </span>
              </div>
              <p className="text-xs text-gray-200 leading-relaxed">
                {String(action.response ?? action.message ?? "")}
              </p>
              {Array.isArray(action.entities_involved) && action.entities_involved.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {(action.entities_involved as string[]).map((e) => (
                    <span key={e} className="px-1.5 py-0.5 bg-indigo-900/30 text-indigo-300 rounded text-xs border border-indigo-800/30">{e}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Event log + Input */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Event Log</h2>
          <div ref={logRef} className="h-40 overflow-y-auto space-y-1">
            {events.length === 0 ? (
              <p className="text-gray-700 text-xs italic">No events yet</p>
            ) : (
              events.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 font-bold" style={{ color: STAGE_META[e.stage]?.color ?? "#9ca3af" }}>
                    [{e.stage}]
                  </span>
                  <span className="text-gray-400 truncate">
                    {JSON.stringify(e.data).slice(0, 120)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col justify-between">
          <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Send Input</h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendInput() } }}
            placeholder="Enter input for the cognitive engine… (Enter to send, Shift+Enter for newline)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded p-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
            rows={4}
          />
          <button
            onClick={sendInput}
            disabled={!connected || !input.trim()}
            className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 rounded text-sm font-medium transition-colors"
          >
            Process through Cognitive Loop
          </button>
        </div>
      </div>
    </div>
  )
}
