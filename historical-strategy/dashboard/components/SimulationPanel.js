import React, { useState } from 'react'

const STRATEGIES = [
  'Guerrilla', 'Blitzkrieg', 'Conventional', 'Naval',
  'Siege', 'Attrition', 'Flanking', 'Deception',
  'Psychological', 'Coalition',
]
const TERRAINS = ['Plains', 'Desert', 'Mountains', 'Forest', 'Urban', 'Sea']
const WEATHERS = ['Clear', 'Rain', 'Snow', 'Storm']

const STRATEGY_COLORS = {
  Guerrilla: '#00ff88', Blitzkrieg: '#ff3355', Conventional: '#00d4ff',
  Naval: '#5588ff', Siege: '#e08020', Attrition: '#bb55ee',
  Flanking: '#ffb400', Deception: '#00c8b4', Psychological: '#dd44dd',
  Coalition: '#64c864',
}

function ProbabilityGauge({ probability }) {
  const pct = Math.round(probability * 100)
  let color = '#ff3355'
  if (pct >= 70) color = '#00ff88'
  else if (pct >= 55) color = '#00d4ff'
  else if (pct >= 45) color = '#ffd700'
  else if (pct >= 30) color = '#ff8800'

  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center w-32 h-32">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(26,58,92,0.6)" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${pct * 2.51} 251`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="relative text-center">
          <div className="text-3xl font-bold font-mono" style={{ color }}>
            {pct}%
          </div>
          <div className="text-xs" style={{ color: '#7a9bbf' }}>Victory</div>
        </div>
      </div>
    </div>
  )
}

function SliderField({ label, name, min, max, step, value, onChange, formatValue }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <label style={{ color: '#7a9bbf' }}>{label}</label>
        <span className="font-mono neon-cyan">{formatValue ? formatValue(value) : value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(name, parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(90deg, #00d4ff ${pct}%, rgba(26,58,92,0.5) ${pct}%)`,
          WebkitAppearance: 'none',
        }}
      />
      <div className="flex justify-between text-xs mt-0.5" style={{ color: '#4a6580' }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function RiskBadge({ level }) {
  const cls = `risk-${level?.toLowerCase()}`
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${cls}`}>
      {level}
    </span>
  )
}

function StrategyBadge({ strategy }) {
  const color = STRATEGY_COLORS[strategy] || '#00d4ff'
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: `${color}18`, border: `1px solid ${color}50`, color }}
    >
      {strategy}
    </span>
  )
}

export default function SimulationPanel() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

  const [form, setForm] = useState({
    attacker_strategy: 'Blitzkrieg',
    defender_strategy: 'Conventional',
    terrain: 'Plains',
    force_ratio: 1.5,
    technology_gap: 0.5,
    supply_lines: 0.8,
    morale: 0.75,
    weather: 'Clear',
  })

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Simulation failed')
      }
      setResult(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadScenario = async (scenarioId) => {
    try {
      const res = await fetch(`${API_URL}/api/scenarios`)
      const data = await res.json()
      const scenario = data.scenarios?.find(s => s.id === scenarioId)
      if (scenario) {
        setForm(prev => ({
          ...prev,
          attacker_strategy: scenario.attacker_strategy,
          defender_strategy: scenario.defender_strategy,
          terrain: scenario.terrain,
        }))
      }
    } catch {}
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold neon-cyan uppercase tracking-wider mb-4">⚙️ Scenario Parameters</h3>

          <div className="space-y-3">
            {/* Strategies */}
            <div>
              <label className="block text-xs mb-1" style={{ color: '#7a9bbf' }}>Attacker Strategy</label>
              <select
                className="cyber-select"
                value={form.attacker_strategy}
                onChange={e => handleChange('attacker_strategy', e.target.value)}
              >
                {STRATEGIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#7a9bbf' }}>Defender Strategy</label>
              <select
                className="cyber-select"
                value={form.defender_strategy}
                onChange={e => handleChange('defender_strategy', e.target.value)}
              >
                {STRATEGIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#7a9bbf' }}>Terrain</label>
              <select
                className="cyber-select"
                value={form.terrain}
                onChange={e => handleChange('terrain', e.target.value)}
              >
                {TERRAINS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#7a9bbf' }}>Weather</label>
              <select
                className="cyber-select"
                value={form.weather}
                onChange={e => handleChange('weather', e.target.value)}
              >
                {WEATHERS.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>

            {/* Sliders */}
            <SliderField
              label="Force Ratio (Attacker/Defender)"
              name="force_ratio"
              min={0.1} max={5.0} step={0.1}
              value={form.force_ratio}
              onChange={handleChange}
              formatValue={v => `${v.toFixed(1)}×`}
            />
            <SliderField
              label="Technology Gap (−2 to +2)"
              name="technology_gap"
              min={-2} max={2} step={0.25}
              value={form.technology_gap}
              onChange={handleChange}
              formatValue={v => v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)}
            />
            <SliderField
              label="Supply Line Reliability"
              name="supply_lines"
              min={0} max={1} step={0.05}
              value={form.supply_lines}
              onChange={handleChange}
              formatValue={v => `${Math.round(v * 100)}%`}
            />
            <SliderField
              label="Attacker Morale"
              name="morale"
              min={0} max={1} step={0.05}
              value={form.morale}
              onChange={handleChange}
              formatValue={v => `${Math.round(v * 100)}%`}
            />
          </div>

          <button type="submit" className="cyber-btn w-full mt-4" disabled={loading}>
            {loading ? '⏳ Simulating...' : '⚔️ Run Simulation'}
          </button>
        </div>

        {/* Presets */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-bold neon-gold uppercase tracking-wider mb-2">Quick Scenarios</h4>
          <div className="flex flex-wrap gap-2">
            {['blitzkrieg_plains', 'guerrilla_forest', 'siege_urban', 'naval_dominance'].map(id => (
              <button
                key={id}
                type="button"
                onClick={() => loadScenario(id)}
                className="text-xs px-2 py-1 rounded transition-all"
                style={{
                  background: 'rgba(255,215,0,0.08)',
                  border: '1px solid rgba(255,215,0,0.2)',
                  color: '#ffd700',
                  cursor: 'pointer',
                }}
              >
                {id.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Results */}
      <div className="lg:col-span-3">
        {error && (
          <div className="glass-card p-4 mb-4" style={{ borderColor: 'rgba(255,51,85,0.3)', background: 'rgba(255,51,85,0.06)' }}>
            <p className="text-sm" style={{ color: '#ff3355' }}>⚠️ {error}</p>
            <p className="text-xs mt-1" style={{ color: '#7a9bbf' }}>Ensure the API server is running at {API_URL}</p>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="glass-card p-8 text-center h-full flex flex-col items-center justify-center">
            <div className="text-5xl mb-4">⚔️</div>
            <h3 className="text-lg font-bold neon-cyan mb-2">Battle Simulator</h3>
            <p className="text-sm" style={{ color: '#7a9bbf' }}>
              Configure scenario parameters and run a simulation to see predicted outcomes,
              historical parallels, and strategic recommendations.
            </p>
          </div>
        )}

        {loading && (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-3 cyber-pulse">⚙️</div>
            <p className="neon-cyan font-semibold">Processing simulation...</p>
            <div className="mt-4 h-1 rounded overflow-hidden" style={{ background: 'rgba(26,58,92,0.5)' }}>
              <div className="h-full rounded loading-bar" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Victory probability */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xs font-bold neon-cyan uppercase tracking-wider mb-1">Simulation Result</h3>
                  <p className="text-base font-bold" style={{ color: '#c8d8e8' }}>
                    {result.outcome_label}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#7a9bbf' }}>{result.scenario_summary}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs" style={{ color: '#7a9bbf' }}>Confidence:</span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        background: 'rgba(0,212,255,0.1)',
                        border: '1px solid rgba(0,212,255,0.3)',
                        color: '#00d4ff',
                      }}
                    >
                      {result.confidence_level}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span style={{ color: '#7a9bbf' }}>Attacker Score: </span>
                      <span className="neon-cyan font-mono">{result.attacker_score?.toFixed(3)}</span>
                    </div>
                    <div>
                      <span style={{ color: '#7a9bbf' }}>Defender Score: </span>
                      <span className="neon-red font-mono">{result.defender_score?.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
                <ProbabilityGauge probability={result.victory_probability} />
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#7a9bbf' }}>Attacker Advantage</span>
                  <span className="font-mono neon-cyan">{Math.round(result.victory_probability * 100)}%</span>
                </div>
                <div className="prob-bar-track">
                  <div
                    className="prob-bar-fill"
                    style={{
                      width: `${result.victory_probability * 100}%`,
                      background: `linear-gradient(90deg, ${
                        result.victory_probability >= 0.7 ? '#00ff88' :
                        result.victory_probability >= 0.5 ? '#00d4ff' :
                        result.victory_probability >= 0.3 ? '#ffd700' : '#ff3355'
                      }, transparent)`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recommended strategy */}
            <div className="glass-card p-4">
              <h4 className="text-xs font-bold neon-gold uppercase tracking-wider mb-3">🎯 Recommended Strategy</h4>
              <div className="flex items-center gap-2 mb-2">
                <StrategyBadge strategy={result.recommended_strategy} />
                <span className="text-xs" style={{ color: '#7a9bbf' }}>Best for {form.terrain} terrain</span>
              </div>
              {result.alternative_strategies?.length > 0 && (
                <div>
                  <p className="text-xs mb-1.5" style={{ color: '#4a6580' }}>Alternatives:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.alternative_strategies.map((alt, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <StrategyBadge strategy={alt.strategy} />
                        <span style={{ color: '#4a6580' }}>({(alt.score * 100).toFixed(0)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Risk Assessment */}
            {result.risk_assessment && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#ff8800' }}>⚠️ Risk Assessment</h4>
                  <RiskBadge level={result.risk_assessment.overall_risk_level} />
                </div>
                <div className="space-y-2">
                  {result.risk_assessment.risk_factors?.map((risk, i) => (
                    <div
                      key={i}
                      className="p-2 rounded text-xs"
                      style={{
                        background: 'rgba(255,136,0,0.06)',
                        border: '1px solid rgba(255,136,0,0.15)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold" style={{ color: '#ffd700' }}>{risk.factor}</span>
                        <RiskBadge level={risk.level} />
                      </div>
                      <p style={{ color: '#7a9bbf' }}>{risk.detail}</p>
                      <p className="mt-1" style={{ color: '#4a6580' }}>
                        <span style={{ color: '#00ff88' }}>Mitigation: </span>{risk.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historical Parallels */}
            {result.historical_parallels?.length > 0 && (
              <div className="glass-card p-4">
                <h4 className="text-xs font-bold neon-cyan uppercase tracking-wider mb-3">
                  📜 Historical Parallels
                </h4>
                <div className="space-y-2">
                  {result.historical_parallels.map((p, i) => (
                    <div
                      key={i}
                      className="p-2 rounded text-xs"
                      style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold" style={{ color: '#c8d8e8' }}>{p.name}</span>
                        <div className="flex items-center gap-1.5">
                          <StrategyBadge strategy={p.strategy_type} />
                          <span className={`outcome-${p.outcome?.toLowerCase()} font-bold`}>{p.outcome}</span>
                        </div>
                      </div>
                      <span style={{ color: '#7a9bbf' }}>
                        {p.year < 0 ? `${Math.abs(p.year)} BC` : p.year} • {p.terrain}
                      </span>
                      {p.lessons?.slice(0, 1).map((l, li) => (
                        <p key={li} className="mt-1" style={{ color: '#4a6580' }}>
                          <span style={{ color: '#ffd700' }}>Lesson: </span>{l}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tactical Advice */}
            {result.tactical_advice?.length > 0 && (
              <div className="glass-card p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#00ff88' }}>
                  💡 Tactical Advice
                </h4>
                <ul className="space-y-1.5">
                  {result.tactical_advice.map((advice, i) => (
                    <li key={i} className="flex gap-2 text-xs" style={{ color: '#7a9bbf' }}>
                      <span style={{ color: '#00ff88', flexShrink: 0 }}>›</span> {advice}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
