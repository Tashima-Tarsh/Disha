import type { ModelStats } from '../types.js'

export class ModelMetrics {
  private stats: Map<string, ModelStats> = new Map()

  record(modelId: string, executionTimeMs: number, quality: number, queryType = 'text'): void {
    const existing = this.stats.get(modelId) ?? this.createEmpty(modelId)
    existing.totalInferences++
    existing.totalTime += executionTimeMs
    existing.averageTime = existing.totalTime / existing.totalInferences
    existing.lastUsed = new Date()
    existing.queryTypes.add(queryType)
    existing.qualityScores.push(quality)
    existing.averageQuality = existing.qualityScores.reduce((s, v) => s + v, 0) / existing.qualityScores.length
    this.stats.set(modelId, existing)
  }

  get(modelId: string): ModelStats | undefined { return this.stats.get(modelId) }
  getAll(): ModelStats[] { return Array.from(this.stats.values()) }

  private createEmpty(modelId: string): ModelStats {
    return { modelId, totalInferences: 0, totalTime: 0, averageTime: 0, lastUsed: new Date(), queryTypes: new Set(), satisfactionScore: 0, qualityScores: [], averageQuality: 0 }
  }
}
