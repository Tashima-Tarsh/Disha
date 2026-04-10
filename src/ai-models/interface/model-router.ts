import type { BudgetLevel, EnsembleOptions, InvokeOptions, Model } from '../types.js'
import { ModelRegistry } from '../registry/model-registry.js'

export class ModelRouter {
  private registry: ModelRegistry

  constructor(registry?: ModelRegistry) {
    this.registry = registry ?? ModelRegistry.getInstance()
  }

  selectBest(options: InvokeOptions): Model | undefined {
    let candidates = this.registry.getAll().filter(m => m.status !== 'error' && m.status !== 'deprecated')

    if (options.modelId) {
      return this.registry.getById(options.modelId)
    }

    if (options.region) {
      candidates = candidates.filter(m => m.region === options.region)
    }

    if (options.category) {
      candidates = candidates.filter(m => m.category === options.category)
    }

    if (options.budget) {
      candidates = this.filterByBudget(candidates, options.budget)
    }

    if (candidates.length === 0) return undefined

    return candidates.sort((a, b) => {
      const weightDiff = b.weights - a.weights
      if (Math.abs(weightDiff) > 0.01) return weightDiff
      return b.performance.qualityScore - a.performance.qualityScore
    })[0]
  }

  selectEnsemble(options: EnsembleOptions, count = 3): Model[] {
    let candidates = this.registry.getAll().filter(m => m.status !== 'error' && m.status !== 'deprecated')

    if (options.region) {
      candidates = candidates.filter(m => m.region === options.region)
    }

    if (options.category) {
      candidates = candidates.filter(m => m.category === options.category)
    }

    candidates.sort((a, b) => b.weights - a.weights)

    if (options.diversityFactor && options.diversityFactor > 0) {
      return this.diverseSelection(candidates, count, options.diversityFactor)
    }

    return candidates.slice(0, count)
  }

  private filterByBudget(models: Model[], budget: BudgetLevel): Model[] {
    const sorted = [...models].sort((a, b) => b.size - a.size)
    const total = sorted.length
    if (total === 0) return []

    switch (budget) {
      case 'cheap':
        return sorted.slice(Math.floor(total * 0.66))
      case 'balanced':
        return sorted.slice(Math.floor(total * 0.33), Math.floor(total * 0.66))
      case 'best':
        return sorted.slice(0, Math.floor(total * 0.33))
      default:
        return models
    }
  }

  private diverseSelection(models: Model[], count: number, diversityFactor: number): Model[] {
    if (models.length <= count) return models

    const selected: Model[] = []
    const usedRegions = new Set<string>()

    for (const model of models) {
      if (selected.length >= count) break
      const regionPenalty = usedRegions.has(model.region) ? diversityFactor : 0
      const score = model.weights - regionPenalty
      if (score > 0.5 || selected.length === 0) {
        selected.push(model)
        usedRegions.add(model.region)
      }
    }

    if (selected.length < count) {
      for (const model of models) {
        if (selected.length >= count) break
        if (!selected.includes(model)) {
          selected.push(model)
        }
      }
    }

    return selected
  }
}
