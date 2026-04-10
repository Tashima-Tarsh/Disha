export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export class Logger {
  private prefix: string
  private level: LogLevel
  private levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }
  constructor(prefix = 'ai-models', level: LogLevel = 'info') { this.prefix = prefix; this.level = level }
  debug(msg: string, meta?: unknown): void { this.log('debug', msg, meta) }
  info(msg: string, meta?: unknown): void { this.log('info', msg, meta) }
  warn(msg: string, meta?: unknown): void { this.log('warn', msg, meta) }
  error(msg: string, meta?: unknown): void { this.log('error', msg, meta) }
  private log(level: LogLevel, msg: string, meta?: unknown): void {
    if (this.levels[level] < this.levels[this.level]) return
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.prefix}] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }
}
