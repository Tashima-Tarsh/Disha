import type { Model } from '../types.js'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class ModelValidator {
  validate(model: Partial<Model>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!model.id || model.id.trim() === '') {
      errors.push('Model id is required')
    }

    if (!model.name || model.name.trim() === '') {
      errors.push('Model name is required')
    }

    if (!model.region) {
      errors.push('Model region is required')
    }

    if (!model.sourceUrl) {
      errors.push('Model sourceUrl is required')
    } else if (!model.sourceUrl.startsWith('http')) {
      errors.push('Model sourceUrl must be a valid URL')
    }

    if (model.size !== undefined && model.size <= 0) {
      errors.push('Model size must be positive')
    }

    if (model.contextWindow !== undefined && model.contextWindow < 0) {
      errors.push('Model contextWindow must be non-negative')
    }

    if (!model.capabilities || model.capabilities.length === 0) {
      warnings.push('Model has no capabilities defined')
    }

    if (model.weights !== undefined && (model.weights < 0 || model.weights > 1)) {
      errors.push('Model weights must be between 0 and 1')
    }

    if (!model.license) {
      warnings.push('Model license is not specified')
    }

    if (!model.version) {
      warnings.push('Model version is not specified')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  validateBatch(models: Partial<Model>[]): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>()
    for (const model of models) {
      const result = this.validate(model)
      results.set(model.id ?? 'unknown', result)
    }
    return results
  }

  isCompatible(model: Model, requirements: Partial<Model>): boolean {
    if (requirements.region && model.region !== requirements.region) return false
    if (requirements.category && model.category !== requirements.category) return false
    if (requirements.capabilities) {
      for (const cap of requirements.capabilities) {
        if (!model.capabilities.includes(cap)) return false
      }
    }
    if (requirements.contextWindow && model.contextWindow < requirements.contextWindow) return false
    return true
  }
}
