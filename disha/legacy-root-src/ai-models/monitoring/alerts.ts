export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export interface Alert { id: string; severity: AlertSeverity; message: string; timestamp: Date; resolved: boolean }
type AlertHandler = (alert: Alert) => void
export class Alerts {
  private alerts: Alert[] = []
  private handlers: AlertHandler[] = []
  private counter = 0
  on(handler: AlertHandler): void { this.handlers.push(handler) }
  emit(severity: AlertSeverity, message: string): Alert {
    const alert: Alert = { id: `alert-${++this.counter}`, severity, message, timestamp: new Date(), resolved: false }
    this.alerts.push(alert)
    for (const h of this.handlers) { try { h(alert) } catch {} }
    return alert
  }
  resolve(id: string): boolean { const a = this.alerts.find(x => x.id === id); if (a) { a.resolved = true; return true } return false }
  getActive(): Alert[] { return this.alerts.filter(a => !a.resolved) }
  getAll(): Alert[] { return [...this.alerts] }
}
