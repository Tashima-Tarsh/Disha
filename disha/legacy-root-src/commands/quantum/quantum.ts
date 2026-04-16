/**
 * /quantum command implementation
 *
 * Interfaces with the Disha Quantum Physics Engine (Layer 6) on port 8002.
 *
 * Subcommands:
 *   /quantum status    — Check if quantum backend is online
 *   /quantum simulate  — Run a Bell state simulation
 *   /quantum classify  — Classify a physics description into a domain
 *   /quantum space     — Fetch NASA Astronomy Picture of the Day
 *   /quantum           — Show help
 */

import type { LocalCommandCall } from '../../types/command.js'

const QUANTUM_API = process.env.QUANTUM_API_URL ?? 'http://localhost:8002'

function showHelp(): string {
  return `quantum — Disha Quantum Physics Engine (Layer 6)

Usage:
  /quantum status          Check if quantum backend is running
  /quantum simulate        Run a Bell state quantum circuit simulation
  /quantum classify <text> Classify physics text into a domain
  /quantum space           Fetch NASA Astronomy Picture of the Day
  /quantum                 Show this help

Backend API: ${QUANTUM_API}
Frontend UI: http://localhost:3003

The quantum backend must be running:
  cd quantum-physics/backend
  uvicorn api.main:app --port 8002`
}

async function handleStatus(): Promise<string> {
  try {
    const resp = await fetch(`${QUANTUM_API}/`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!resp.ok) {
      return `Quantum backend returned HTTP ${resp.status}`
    }
    const data = await resp.json()
    const endpoints: string[] = Array.isArray(data.endpoints) ? data.endpoints : []
    return [
      `✓ Quantum Physics API — ${data.service ?? 'online'}`,
      `  Version: ${data.version ?? 'unknown'}`,
      `  Layer:   ${data.layer ?? 6}`,
      `  Status:  online`,
      `  Endpoints (${endpoints.length}): ${endpoints.slice(0, 5).join(', ')}${endpoints.length > 5 ? '…' : ''}`,
    ].join('\n')
  } catch (err) {
    return [
      '✗ Quantum backend is offline or unreachable.',
      `  URL: ${QUANTUM_API}`,
      `  Error: ${err instanceof Error ? err.message : String(err)}`,
      '',
      'Start it with:',
      '  cd quantum-physics/backend',
      '  uvicorn api.main:app --port 8002',
    ].join('\n')
  }
}

async function handleSimulate(): Promise<string> {
  try {
    // Run a Bell state experiment
    const resp = await fetch(`${QUANTUM_API}/api/quantum/bell`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()

    const probs = data.probabilities ?? {}
    const probLines = Object.entries(probs)
      .map(([state, p]) => `  |${state}⟩  ${((p as number) * 100).toFixed(1)}%`)
      .join('\n')

    const corr = data.correlations ?? {}
    return [
      `⚛ Bell State Experiment — ${data.state ?? 'Φ+ Bell state'}`,
      `  ${data.description ?? '(|00⟩ + |11⟩)/√2'}`,
      '',
      'Measurement Probabilities:',
      probLines,
      '',
      'Correlations:',
      `  E(ZZ) = ${corr['E(ZZ)'] ?? 'N/A'}`,
      `  Bell inequality S = ${corr['bell_inequality_S'] ?? 'N/A'} (classical limit: ${corr['classical_limit'] ?? 2})`,
      `  Violation: ${corr['violation'] === true ? 'YES — quantum entanglement confirmed ✓' : 'no'}`,
    ].join('\n')
  } catch (err) {
    return `Failed to run Bell state simulation: ${err instanceof Error ? err.message : String(err)}`
  }
}

async function handleClassify(text: string): Promise<string> {
  if (!text || !text.trim()) {
    return 'Usage: /quantum classify <physics description>\nExample: /quantum classify "Heisenberg uncertainty principle limits position measurement"'
  }
  try {
    const resp = await fetch(`${QUANTUM_API}/api/physics/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()

    const confidence = ((data.confidence ?? 0) * 100).toFixed(1)
    const concepts: string[] = Array.isArray(data.related_concepts) ? data.related_concepts : []

    return [
      `Physics Classification Result`,
      `  Domain:     ${data.domain ?? 'Unknown'}`,
      `  Confidence: ${confidence}%`,
      `  Method:     ${data.method ?? 'keyword'}`,
      concepts.length > 0 ? `  Concepts:   ${concepts.slice(0, 4).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  } catch (err) {
    return `Classification failed: ${err instanceof Error ? err.message : String(err)}`
  }
}

async function handleSpace(): Promise<string> {
  try {
    const resp = await fetch(`${QUANTUM_API}/api/space/apod`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()

    const explanation: string = data.explanation ?? ''
    const excerpt = explanation.length > 280 ? explanation.slice(0, 280) + '…' : explanation

    return [
      `🔭 NASA Astronomy Picture of the Day`,
      `  Title:   ${data.title ?? 'Unknown'}`,
      `  Date:    ${data.date ?? 'N/A'}`,
      `  Credit:  ${data.copyright ?? 'NASA'}`,
      data.fallback ? '  ⚠ (cached fallback data)' : '',
      '',
      excerpt,
      '',
      `  URL: ${data.url ?? 'N/A'}`,
    ]
      .filter((l) => l !== undefined)
      .join('\n')
  } catch (err) {
    return `Failed to fetch NASA APOD: ${err instanceof Error ? err.message : String(err)}`
  }
}

export const call: LocalCommandCall = async (args) => {
  const parts = (args ?? '').trim().split(/\s+/)
  const subcommand = (parts[0] ?? '').toLowerCase()
  const rest = parts.slice(1).join(' ')

  let value: string

  switch (subcommand) {
    case 'status':
      value = await handleStatus()
      break
    case 'simulate':
      value = await handleSimulate()
      break
    case 'classify':
      value = await handleClassify(rest)
      break
    case 'space':
      value = await handleSpace()
      break
    default:
      value = showHelp()
  }

  return { type: 'text', value }
}
