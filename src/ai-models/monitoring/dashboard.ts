import type { SystemHealth } from '../types.js'
import { ModelRegistry } from '../registry/model-registry.js'
export class Dashboard {
  private registry: ModelRegistry
  constructor(registry?: ModelRegistry) { this.registry = registry ?? ModelRegistry.getInstance() }
  getHealth(): SystemHealth {
    const loaded = this.registry.getLoaded().length
    const memUsage = process.memoryUsage()
    const available = memUsage.heapTotal - memUsage.heapUsed
    const status = loaded > 0 ? 'healthy' : 'degraded'
    return { status, loadedModels: loaded, availableMemory: available, cpuUsage: 0, requestsPerSecond: 0 }
  }
  getSummary(): Record<string, unknown> {
    return { totalModels: this.registry.count(), loadedModels: this.registry.getLoaded().length, regions: ['chinese','russian','western','japanese','indian'].map(r => ({ region: r, count: this.registry.filterByRegion(r as never).length })) }
  }
}
