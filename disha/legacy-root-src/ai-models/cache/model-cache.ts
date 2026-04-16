import type { CacheEntry } from '../types.js'

export class ModelCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private maxSize: number
  private defaultTtlMs: number

  constructor(maxSize = 1000, defaultTtlMs = 60 * 60 * 1000) {
    this.maxSize = maxSize
    this.defaultTtlMs = defaultTtlMs
  }

  set(key: string, value: T, ttlMs?: number): void {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (ttlMs ?? this.defaultTtlMs))

    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest()
    }

    this.cache.set(key, {
      key,
      value,
      createdAt: now,
      expiresAt,
      hits: 0,
    })
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (new Date() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    entry.hits++
    return entry.value
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  purgeExpired(): number {
    const now = new Date()
    let count = 0
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  getStats(): { size: number; hitRate: number; totalHits: number } {
    let totalHits = 0
    let totalRequests = 0
    for (const entry of this.cache.values()) {
      totalHits += entry.hits
      totalRequests += entry.hits + 1
    }
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalHits,
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      const time = entry.createdAt.getTime()
      if (time < oldestTime) {
        oldestTime = time
        oldestKey = key
      }
    }

    if (oldestKey) this.cache.delete(oldestKey)
  }
}
