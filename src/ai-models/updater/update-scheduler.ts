import type { ScheduledUpdate } from '../types.js'
import { ModelAutoUpdater } from './auto-updater.js'

export class UpdateScheduler {
  private queue: ScheduledUpdate[] = []
  private updater: ModelAutoUpdater
  private running = false
  private intervalId: ReturnType<typeof setTimeout> | null = null

  constructor(updater?: ModelAutoUpdater) {
    this.updater = updater ?? new ModelAutoUpdater()
  }

  schedule(modelId: string, priority: ScheduledUpdate['priority'] = 'normal'): ScheduledUpdate {
    const existing = this.queue.find(u => u.modelId === modelId && u.status === 'pending')
    if (existing) return existing

    const update: ScheduledUpdate = {
      modelId,
      scheduledAt: new Date(),
      priority,
      status: 'pending',
    }
    this.queue.push(update)
    this.sortQueue()
    return update
  }

  cancel(modelId: string): boolean {
    const idx = this.queue.findIndex(u => u.modelId === modelId && u.status === 'pending')
    if (idx >= 0) {
      this.queue.splice(idx, 1)
      return true
    }
    return false
  }

  getQueue(): ScheduledUpdate[] {
    return [...this.queue]
  }

  getPending(): ScheduledUpdate[] {
    return this.queue.filter(u => u.status === 'pending')
  }

  startProcessing(intervalMs = 60000): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => {
      this.processNext().catch(console.error)
    }, intervalMs)
  }

  stopProcessing(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  async processNext(): Promise<void> {
    if (this.running) return
    const next = this.getPending()[0]
    if (!next) return

    this.running = true
    next.status = 'running'

    try {
      const updates = await this.updater.checkForUpdates()
      const matching = updates.find(u => u.modelId === next.modelId)
      if (matching) {
        await this.updater.applyUpdate(matching)
      }
      next.status = 'completed'
    } catch {
      next.status = 'failed'
    } finally {
      this.running = false
    }
  }

  private sortQueue(): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    this.queue.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pDiff !== 0) return pDiff
      return a.scheduledAt.getTime() - b.scheduledAt.getTime()
    })
  }
}
