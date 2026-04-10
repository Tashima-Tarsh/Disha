export interface ProfileSpan { name: string; startMs: number; endMs: number; durationMs: number; metadata: Record<string, unknown> }

export class Profiler {
  private spans: ProfileSpan[] = []
  private active: Map<string, number> = new Map()

  start(name: string): void { this.active.set(name, Date.now()) }

  end(name: string, metadata: Record<string, unknown> = {}): ProfileSpan | null {
    const startMs = this.active.get(name)
    if (startMs === undefined) return null
    this.active.delete(name)
    const endMs = Date.now()
    const span: ProfileSpan = { name, startMs, endMs, durationMs: endMs - startMs, metadata }
    this.spans.push(span)
    return span
  }

  getSpans(): ProfileSpan[] { return [...this.spans] }
  clear(): void { this.spans = []; this.active.clear() }
  summary(): Record<string, { count: number; avgMs: number; maxMs: number }> {
    const groups: Record<string, number[]> = {}
    for (const s of this.spans) { (groups[s.name] ??= []).push(s.durationMs) }
    const result: Record<string, { count: number; avgMs: number; maxMs: number }> = {}
    for (const [name, durations] of Object.entries(groups)) {
      result[name] = { count: durations.length, avgMs: durations.reduce((a, b) => a + b, 0) / durations.length, maxMs: Math.max(...durations) }
    }
    return result
  }
}
