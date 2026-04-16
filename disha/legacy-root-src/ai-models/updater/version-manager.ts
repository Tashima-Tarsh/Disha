import type { ModelVersion } from '../types.js'

export class VersionManager {
  private versions: Map<string, ModelVersion[]> = new Map()

  async fetchLatestVersion(modelId: string): Promise<string | null> {
    // Stub: real implementation would check HuggingFace/registry APIs
    const known = this.versions.get(modelId)
    if (known && known.length > 0) {
      const active = known.filter(v => v.active).sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime())
      return active[0]?.versionNumber ?? null
    }
    return null
  }

  addVersion(version: ModelVersion): void {
    const list = this.versions.get(version.modelId) ?? []
    list.push(version)
    this.versions.set(version.modelId, list)
  }

  getVersions(modelId: string): ModelVersion[] {
    return this.versions.get(modelId) ?? []
  }

  getActiveVersion(modelId: string): ModelVersion | undefined {
    return this.getVersions(modelId).find(v => v.active)
  }

  deprecateVersion(modelId: string, versionNumber: string): boolean {
    const versions = this.versions.get(modelId)
    if (!versions) return false

    const version = versions.find(v => v.versionNumber === versionNumber)
    if (!version) return false

    version.status = 'deprecated'
    version.active = false
    return true
  }

  compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number)
    const partsB = b.split('.').map(Number)

    const maxLen = Math.max(partsA.length, partsB.length)
    for (let i = 0; i < maxLen; i++) {
      const numA = partsA[i] ?? 0
      const numB = partsB[i] ?? 0
      if (numA !== numB) return numA - numB
    }
    return 0
  }

  isNewer(candidate: string, current: string): boolean {
    return this.compareVersions(candidate, current) > 0
  }
}
