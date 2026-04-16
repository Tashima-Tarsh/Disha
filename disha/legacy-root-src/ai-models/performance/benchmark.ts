import type { BenchmarkResult } from '../types.js'

export class Benchmark {
  private results: BenchmarkResult[] = []

  async run(modelId: string, taskType: string, fn: () => Promise<string>): Promise<BenchmarkResult> {
    const start = Date.now()
    const output = await fn()
    const latencyMs = Date.now() - start
    const result: BenchmarkResult = { modelId, taskType, score: Math.min(1, output.length / 100), latencyMs, tokensPerSecond: (output.length / 4) / (latencyMs / 1000), timestamp: new Date() }
    this.results.push(result)
    return result
  }

  getResults(modelId?: string): BenchmarkResult[] {
    return modelId ? this.results.filter(r => r.modelId === modelId) : [...this.results]
  }

  clear(): void { this.results = [] }
}
