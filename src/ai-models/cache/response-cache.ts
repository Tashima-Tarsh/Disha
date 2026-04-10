import type { ModelResponse } from '../types.js'
import { ModelCache } from './model-cache.js'

export class ResponseCache {
  private cache: ModelCache<ModelResponse>
  private keyPrefix = 'resp'

  constructor(maxSize = 5000, ttlMs = 30 * 60 * 1000) {
    this.cache = new ModelCache<ModelResponse>(maxSize, ttlMs)
  }

  buildKey(prompt: string, modelId: string, temperature?: number): string {
    const hash = this.simpleHash(`${prompt}::${modelId}::${temperature ?? 'default'}`)
    return `${this.keyPrefix}:${hash}`
  }

  set(prompt: string, modelId: string, response: ModelResponse, temperature?: number): void {
    const key = this.buildKey(prompt, modelId, temperature)
    this.cache.set(key, response)
  }

  get(prompt: string, modelId: string, temperature?: number): ModelResponse | undefined {
    const key = this.buildKey(prompt, modelId, temperature)
    return this.cache.get(key)
  }

  has(prompt: string, modelId: string, temperature?: number): boolean {
    const key = this.buildKey(prompt, modelId, temperature)
    return this.cache.has(key)
  }

  invalidateModel(modelId: string): void {
    // Cache doesn't expose iteration by modelId prefix in this impl;
    // in production this would be done with a secondary index
    this.cache.clear()
  }

  purgeExpired(): number {
    return this.cache.purgeExpired()
  }

  getStats() {
    return this.cache.getStats()
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }
}
