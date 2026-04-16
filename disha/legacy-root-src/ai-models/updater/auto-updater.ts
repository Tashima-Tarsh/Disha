import type { Model, UpdateInfo } from '../types.js'
import { ModelRegistry } from '../registry/model-registry.js'
import { VersionManager } from './version-manager.js'

export class ModelAutoUpdater {
  private registry: ModelRegistry
  private versionManager: VersionManager
  private running = false

  constructor(registry?: ModelRegistry) {
    this.registry = registry ?? ModelRegistry.getInstance()
    this.versionManager = new VersionManager()
  }

  async checkForUpdates(): Promise<UpdateInfo[]> {
    const updates: UpdateInfo[] = []
    const models = this.registry.getAll()

    for (const model of models) {
      const latest = await this.versionManager.fetchLatestVersion(model.id).catch(() => null)
      if (latest && latest !== model.version) {
        updates.push({
          modelId: model.id,
          currentVersion: model.version,
          latestVersion: latest,
          changeLog: `Update from ${model.version} to ${latest}`,
          size: model.size,
        })
      }
    }

    return updates
  }

  async applyUpdate(update: UpdateInfo): Promise<void> {
    const model = this.registry.getById(update.modelId)
    if (!model) throw new Error(`Model not found: ${update.modelId}`)

    this.registry.updateStatus(update.modelId, 'downloading')

    try {
      await this.downloadUpdate(model, update)
      model.version = update.latestVersion
      model.lastUpdated = new Date()
      this.registry.updateStatus(update.modelId, 'available')
    } catch (err) {
      this.registry.updateStatus(update.modelId, 'error')
      throw err
    }
  }

  async applyBatch(updates: UpdateInfo[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = []
    const failed: string[] = []

    for (const update of updates) {
      try {
        await this.applyUpdate(update)
        success.push(update.modelId)
      } catch {
        failed.push(update.modelId)
      }
    }

    return { success, failed }
  }

  isRunning(): boolean {
    return this.running
  }

  private async downloadUpdate(_model: Model, _update: UpdateInfo): Promise<void> {
    // Stub: real implementation would download updated weights
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}
