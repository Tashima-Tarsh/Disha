import { ModelCache } from './model-cache.js'
import { ResponseCache } from './response-cache.js'

export interface CacheManagerStats {
  modelCache: ReturnType<ModelCache<unknown>['getStats']>
  responseCache: ReturnType<ResponseCache['getStats']>
  totalMemoryEstimateKb: number
}

export class CacheManager {
  private modelCaches: Map<string, ModelCache<unknown>> = new Map()
  responseCache: ResponseCache

  constructor() {
    this.responseCache = new ResponseCache()
  }

  getOrCreateModelCache<T>(name: string, maxSize?: number, ttlMs?: number): ModelCache<T> {
    if (!this.modelCaches.has(name)) {
      this.modelCaches.set(name, new ModelCache<T>(maxSize, ttlMs))
    }
    return this.modelCaches.get(name) as ModelCache<T>
  }

  purgeAll(): number {
    let total = 0
    for (const cache of this.modelCaches.values()) {
      total += cache.purgeExpired()
    }
    total += this.responseCache.purgeExpired()
    return total
  }

  clearAll(): void {
    for (const cache of this.modelCaches.values()) {
      cache.clear()
    }
    this.responseCache.purgeExpired()
  }

  getStats(): CacheManagerStats {
    const placeholder = this.getOrCreateModelCache<unknown>('_stats_placeholder')
    return {
      modelCache: placeholder.getStats(),
      responseCache: this.responseCache.getStats(),
      totalMemoryEstimateKb: this.estimateMemoryKb(),
    }
  }

  schedulePurge(intervalMs = 5 * 60 * 1000): ReturnType<typeof setInterval> {
    return setInterval(() => {
      this.purgeAll()
    }, intervalMs)
  }

  private estimateMemoryKb(): number {
    let total = 0
    for (const cache of this.modelCaches.values()) {
      total += cache.size() * 1 // rough estimate: 1KB per entry
    }
    total += this.responseCache.getStats().size * 2 // responses ~2KB each
    return total
  }
}
