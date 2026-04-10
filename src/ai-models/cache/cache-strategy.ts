export type EvictionPolicy = 'lru' | 'lfu' | 'ttl' | 'fifo'

export interface CacheStrategyConfig {
  policy: EvictionPolicy
  maxSize: number
  ttlMs: number
  compressionEnabled: boolean
  persistToDisk: boolean
}

export class CacheStrategy {
  private config: CacheStrategyConfig

  constructor(config?: Partial<CacheStrategyConfig>) {
    this.config = {
      policy: config?.policy ?? 'lru',
      maxSize: config?.maxSize ?? 1000,
      ttlMs: config?.ttlMs ?? 60 * 60 * 1000,
      compressionEnabled: config?.compressionEnabled ?? false,
      persistToDisk: config?.persistToDisk ?? false,
    }
  }

  getConfig(): CacheStrategyConfig {
    return { ...this.config }
  }

  shouldEvict(currentSize: number): boolean {
    return currentSize >= this.config.maxSize
  }

  isExpired(createdAt: Date): boolean {
    return Date.now() - createdAt.getTime() > this.config.ttlMs
  }

  computePriority(hits: number, createdAt: Date, lastAccessed: Date): number {
    switch (this.config.policy) {
      case 'lru':
        return lastAccessed.getTime()
      case 'lfu':
        return hits
      case 'ttl':
        return -(createdAt.getTime() + this.config.ttlMs - Date.now())
      case 'fifo':
        return createdAt.getTime()
      default:
        return lastAccessed.getTime()
    }
  }

  static forResponses(): CacheStrategy {
    return new CacheStrategy({
      policy: 'lru',
      maxSize: 5000,
      ttlMs: 30 * 60 * 1000,
      compressionEnabled: true,
    })
  }

  static forModels(): CacheStrategy {
    return new CacheStrategy({
      policy: 'lfu',
      maxSize: 100,
      ttlMs: 24 * 60 * 60 * 1000,
      compressionEnabled: false,
    })
  }
}
