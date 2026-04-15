import { createRequire } from 'module'
import type { Model, ModelRegion, QuantizationType } from '../types.js'
import { ModelRegistry } from './model-registry.js'

interface RawModelEntry {
  id: string
  name: string
  region: ModelRegion
  category: string
  size: number
  contextWindow: number
  capabilities: string[]
  sourceUrl: string
  downloadCount: number
  version: string
  parameters: string
  license: string
  weights: number
  quantization: QuantizationType
}

interface ModelRegistryJSON {
  version: string
  lastUpdated: string
  totalModels: number
  models: RawModelEntry[]
}

export class ModelDiscoverer {
  private registry: ModelRegistry

  constructor(registry?: ModelRegistry) {
    this.registry = registry ?? ModelRegistry.getInstance()
  }

  async discoverFromConfig(): Promise<number> {
    const require = createRequire(import.meta.url)
    const configPath = new URL('../config/model-registry.json', import.meta.url)
    const raw = require(configPath.pathname) as ModelRegistryJSON

    let count = 0
    for (const entry of raw.models) {
      if (!this.registry.has(entry.id)) {
        const model = this.mapRawToModel(entry)
        this.registry.add(model)
        count++
      }
    }
    return count
  }

  async discoverFromDirectory(dirPath: string): Promise<string[]> {
    const discovered: string[] = []
    try {
      const { readdir } = await import('fs/promises')
      const entries = await readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          discovered.push(entry.name)
        }
      }
    } catch {
      // Directory may not exist yet
    }
    return discovered
  }

  private mapRawToModel(entry: RawModelEntry): Model {
    return {
      id: entry.id,
      name: entry.name,
      region: entry.region,
      category: entry.category,
      size: entry.size,
      contextWindow: entry.contextWindow,
      capabilities: entry.capabilities as Model['capabilities'],
      sourceUrl: entry.sourceUrl,
      downloadCount: entry.downloadCount,
      lastUpdated: new Date(),
      status: 'available',
      performance: {
        averageLatency: 0,
        qualityScore: entry.weights,
        successRate: 1.0,
        throughput: 0,
      },
      weights: entry.weights,
      license: entry.license,
      version: entry.version,
      parameters: entry.parameters,
      quantization: entry.quantization,
    }
  }
}
