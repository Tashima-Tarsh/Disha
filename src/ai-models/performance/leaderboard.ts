import type { BenchmarkResult, LeaderboardEntry, ModelRegion } from '../types.js'
import { ModelRegistry } from '../registry/model-registry.js'

export class Leaderboard {
  private registry: ModelRegistry
  constructor(registry?: ModelRegistry) { this.registry = registry ?? ModelRegistry.getInstance() }

  build(results: BenchmarkResult[], region?: ModelRegion): LeaderboardEntry[] {
    const grouped = new Map<string, BenchmarkResult[]>()
    for (const r of results) {
      const list = grouped.get(r.modelId) ?? []
      list.push(r)
      grouped.set(r.modelId, list)
    }
    const entries: Omit<LeaderboardEntry, 'rank'>[] = []
    for (const [modelId, bResults] of grouped) {
      const model = this.registry.getById(modelId)
      if (!model) continue
      if (region && model.region !== region) continue
      const score = bResults.reduce((s, r) => s + r.score, 0) / bResults.length
      entries.push({ modelId, modelName: model.name, score, region: model.region, category: model.category, benchmarkResults: bResults })
    }
    return entries.sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }))
  }
}
