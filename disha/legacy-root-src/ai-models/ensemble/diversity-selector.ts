import type { Model, ModelRegion } from '../types.js'
import { ModelRegistry } from '../registry/model-registry.js'

export interface SelectionCriteria {
  count: number
  maxPerRegion?: number
  maxPerCategory?: number
  minWeight?: number
}

export class DiversitySelector {
  private registry: ModelRegistry

  constructor(registry?: ModelRegistry) {
    this.registry = registry ?? ModelRegistry.getInstance()
  }

  select(criteria: SelectionCriteria): Model[] {
    const candidates = this.registry
      .getAll()
      .filter(m => m.status !== 'error' && m.status !== 'deprecated')
      .filter(m => (criteria.minWeight === undefined ? true : m.weights >= criteria.minWeight))
      .sort((a, b) => b.weights - a.weights)

    const selected: Model[] = []
    const regionCounts = new Map<ModelRegion, number>()
    const categoryCounts = new Map<string, number>()

    for (const model of candidates) {
      if (selected.length >= criteria.count) break

      const regionCount = regionCounts.get(model.region) ?? 0
      if (criteria.maxPerRegion !== undefined && regionCount >= criteria.maxPerRegion) continue

      const categoryCount = categoryCounts.get(model.category) ?? 0
      if (criteria.maxPerCategory !== undefined && categoryCount >= criteria.maxPerCategory) continue

      selected.push(model)
      regionCounts.set(model.region, regionCount + 1)
      categoryCounts.set(model.category, categoryCount + 1)
    }

    return selected
  }

  computeDiversityScore(models: Model[]): number {
    if (models.length <= 1) return 0

    const regions = new Set(models.map(m => m.region))
    const categories = new Set(models.map(m => m.category))
    const paramSizes = models.map(m => Number.parseInt(m.parameters.replace(/[^0-9]/g, '') || '0', 10))

    const regionDiversity = regions.size / models.length
    const categoryDiversity = categories.size / models.length
    const sizeDiversity = this.coefficientOfVariation(paramSizes)

    return (regionDiversity + categoryDiversity + Math.min(1, sizeDiversity)) / 3
  }

  private coefficientOfVariation(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    if (mean === 0) return 0
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
    return Math.sqrt(variance) / mean
  }
}
