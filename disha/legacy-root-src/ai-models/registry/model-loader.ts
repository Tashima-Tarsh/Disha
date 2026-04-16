import type { Model } from '../types.js'
import { ModelRegistry } from './model-registry.js'

export interface LoadOptions {
  quantization?: '4bit' | '8bit' | 'none'
  device?: 'cpu' | 'cuda' | 'metal'
  maxMemoryGb?: number
}

export class ModelLoader {
  private registry: ModelRegistry
  private loadedPaths: Map<string, string> = new Map()

  constructor(registry?: ModelRegistry) {
    this.registry = registry ?? ModelRegistry.getInstance()
  }

  async load(modelId: string, options: LoadOptions = {}): Promise<Model> {
    const model = this.registry.getById(modelId)
    if (!model) {
      throw new Error(`Model not found: ${modelId}`)
    }

    if (model.status === 'loaded') {
      return model
    }

    this.registry.updateStatus(modelId, 'downloading')

    // Simulate loading (stub implementation - real loading would pull weights)
    await this.simulateLoad(model, options)

    const modelPath = this.resolveModelPath(model)
    this.loadedPaths.set(modelId, modelPath)
    this.registry.updatePath(modelId, modelPath)
    this.registry.updateStatus(modelId, 'loaded')

    return this.registry.getById(modelId) as Model
  }

  async unload(modelId: string): Promise<void> {
    const model = this.registry.getById(modelId)
    if (!model) throw new Error(`Model not found: ${modelId}`)

    this.loadedPaths.delete(modelId)
    this.registry.updateStatus(modelId, 'available')
    this.registry.updatePath(modelId, undefined as unknown as string)
  }

  isLoaded(modelId: string): boolean {
    return this.loadedPaths.has(modelId)
  }

  getLoadedPath(modelId: string): string | undefined {
    return this.loadedPaths.get(modelId)
  }

  private async simulateLoad(model: Model, _options: LoadOptions): Promise<void> {
    // Stub: in production this would download and load model weights
    const delayMs = Math.min(100 + model.size / 1e12, 500)
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  private resolveModelPath(model: Model): string {
    const basePath = process.env.AI_MODELS_STORAGE ?? './models'
    return `${basePath}/${model.region}/${model.id}`
  }
}
