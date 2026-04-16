export interface PrometheusMetric { name: string; help: string; type: 'counter' | 'gauge' | 'histogram'; value: number; labels: Record<string, string> }
export class PrometheusExporter {
  private metrics: Map<string, PrometheusMetric> = new Map()
  register(name: string, help: string, type: PrometheusMetric['type']): void {
    this.metrics.set(name, { name, help, type, value: 0, labels: {} })
  }
  set(name: string, value: number, labels: Record<string, string> = {}): void {
    const m = this.metrics.get(name)
    if (m) { m.value = value; m.labels = labels }
  }
  inc(name: string, by = 1): void { const m = this.metrics.get(name); if (m) m.value += by }
  format(): string {
    const lines: string[] = []
    for (const m of this.metrics.values()) {
      lines.push(`# HELP ${m.name} ${m.help}`, `# TYPE ${m.name} ${m.type}`)
      const labelStr = Object.entries(m.labels).map(([k, v]) => `${k}="${v}"`).join(',')
      lines.push(`${m.name}${labelStr ? `{${labelStr}}` : ''} ${m.value}`)
    }
    return lines.join('\n')
  }
}
