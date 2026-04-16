import type { Model, ModelCapability, ModelRegion, ModelStatus } from '../types.js'

export class ModelRegistry {
  private static instance: ModelRegistry
  private models: Map<string, Model> = new Map()

  private constructor() {}

  static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry()
    }
    return ModelRegistry.instance
  }

  add(model: Model): void {
    this.models.set(model.id, model)
  }

  addBatch(models: Model[]): void {
    for (const model of models) {
      this.add(model)
    }
  }

  getAll(): Model[] {
    return Array.from(this.models.values())
  }

  getById(id: string): Model | undefined {
    return this.models.get(id)
  }

  filterByRegion(region: ModelRegion): Model[] {
    return this.getAll().filter(m => m.region === region)
  }

  filterByCapability(capability: ModelCapability): Model[] {
    return this.getAll().filter(m => m.capabilities.includes(capability))
  }

  filterByStatus(status: ModelStatus): Model[] {
    return this.getAll().filter(m => m.status === status)
  }

  filterByCategory(category: string): Model[] {
    return this.getAll().filter(m => m.category === category)
  }

  count(): number {
    return this.models.size
  }

  getLoaded(): Model[] {
    return this.filterByStatus('loaded')
  }

  updateStatus(id: string, status: ModelStatus): boolean {
    const model = this.models.get(id)
    if (!model) return false
    model.status = status
    return true
  }

  updatePath(id: string, path: string): boolean {
    const model = this.models.get(id)
    if (!model) return false
    model.path = path
    return true
  }

  remove(id: string): boolean {
    return this.models.delete(id)
  }

  clear(): void {
    this.models.clear()
  }

  has(id: string): boolean {
    return this.models.has(id)
  }

  search(query: string): Model[] {
    const lowerQuery = query.toLowerCase()
    return this.getAll().filter(
      m =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.id.toLowerCase().includes(lowerQuery) ||
        m.category.toLowerCase().includes(lowerQuery),
    )
  }

  sortByWeight(descending = true): Model[] {
    const models = this.getAll()
    return models.sort((a, b) => (descending ? b.weights - a.weights : a.weights - b.weights))
  }
}
