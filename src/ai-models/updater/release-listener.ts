export interface ReleaseEvent {
  modelId: string
  version: string
  releaseDate: Date
  sourceUrl: string
  changeLog: string
  size: number
}

type ReleaseHandler = (event: ReleaseEvent) => void | Promise<void>

export class ReleaseListener {
  private handlers: ReleaseHandler[] = []
  private pollingIntervalId: ReturnType<typeof setTimeout> | null = null
  private pollIntervalMs: number

  constructor(pollIntervalMs = 60 * 60 * 1000) {
    this.pollIntervalMs = pollIntervalMs
  }

  on(handler: ReleaseHandler): void {
    this.handlers.push(handler)
  }

  off(handler: ReleaseHandler): void {
    const idx = this.handlers.indexOf(handler)
    if (idx >= 0) this.handlers.splice(idx, 1)
  }

  startPolling(): void {
    if (this.pollingIntervalId) return
    this.pollingIntervalId = setInterval(() => {
      this.poll().catch(console.error)
    }, this.pollIntervalMs)
  }

  stopPolling(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId)
      this.pollingIntervalId = null
    }
  }

  async emit(event: ReleaseEvent): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(event)
      } catch (err) {
        console.error('Release handler error:', err)
      }
    }
  }

  private async poll(): Promise<void> {
    // Stub: real implementation would poll HuggingFace, model provider APIs, etc.
    // No-op for now
  }
}
