import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

const STRATEGIES = [
  'Guerrilla', 'Blitzkrieg', 'Conventional', 'Naval',
  'Siege', 'Attrition', 'Flanking', 'Deception',
  'Psychological', 'Coalition',
]

const TERRAINS = ['Plains', 'Desert', 'Mountains', 'Forest', 'Urban', 'Sea']

const STRATEGY_EFFECTIVENESS = {
  Guerrilla:     { Mountains: 0.85, Forest: 0.80, Urban: 0.75, Plains: 0.45, Desert: 0.60, Sea: 0.20 },
  Conventional:  { Plains: 0.75,   Desert: 0.70, Mountains: 0.45, Forest: 0.50, Urban: 0.55, Sea: 0.40 },
  Naval:         { Sea: 0.90,       Plains: 0.20, Desert: 0.15, Mountains: 0.10, Forest: 0.15, Urban: 0.30 },
  Siege:         { Urban: 0.80,     Mountains: 0.60, Plains: 0.50, Desert: 0.45, Forest: 0.40, Sea: 0.20 },
  Blitzkrieg:    { Plains: 0.85,    Desert: 0.80, Forest: 0.50, Mountains: 0.35, Urban: 0.55, Sea: 0.20 },
  Attrition:     { Mountains: 0.70, Forest: 0.65, Urban: 0.75, Plains: 0.60, Desert: 0.55, Sea: 0.40 },
  Flanking:      { Plains: 0.80,    Desert: 0.75, Forest: 0.55, Mountains: 0.45, Urban: 0.60, Sea: 0.50 },
  Deception:     { Urban: 0.80,     Forest: 0.75, Mountains: 0.70, Plains: 0.70, Desert: 0.65, Sea: 0.60 },
  Psychological: { Urban: 0.75,     Plains: 0.65, Forest: 0.60, Mountains: 0.55, Desert: 0.60, Sea: 0.50 },
  Coalition:     { Plains: 0.75,    Desert: 0.70, Sea: 0.70,  Mountains: 0.65, Forest: 0.60, Urban: 0.65 },
}

const STRATEGY_COLORS = {
  Guerrilla: '#00ff88', Blitzkrieg: '#ff3355', Conventional: '#00d4ff',
  Naval: '#5588ff', Siege: '#e08020', Attrition: '#bb55ee',
  Flanking: '#ffb400', Deception: '#00c8b4', Psychological: '#dd44dd',
  Coalition: '#64c864',
}

const STRATEGY_ADVANTAGES = {
  Guerrilla: ['Terrain adaptability', 'Low resource needs', 'Difficult to counter conventionally', 'Home terrain multiplier'],
  Blitzkrieg: ['Speed and shock effect', 'Devastating in open terrain', 'Paralyzes enemy command', 'Air-ground synergy'],
  Conventional: ['Flexibility', 'Well-tested doctrine', 'Adaptable to most situations', 'Scalable force structure'],
  Naval: ['Long-range power projection', 'Blockade capability', 'Enables amphibious ops', 'Trade denial'],
  Siege: ['Reduces fortified positions', 'Conservative of attacker lives', 'Starves out defenders', 'Psychological pressure'],
  Attrition: ['Works with numerical superiority', 'Sustainable over time', 'Degrades enemy systematically', 'Low tactical risk'],
  Flanking: ['Decisive when executed well', 'Maximizes enemy casualties', 'Psychological shock', 'Classic encirclement'],
  Deception: ['Force multiplier effect', 'Achieves surprise', 'Low cost vs high impact', 'Paralyzes enemy reserves'],
  Psychological: ['Wins without destroying forces', 'Exploits political divisions', 'Media amplification', 'Undercuts enemy will'],
  Coalition: ['Combined resources', 'Political legitimacy', 'Shared strategic burden', 'Multiple pressure points'],
}

const STRATEGY_DISADVANTAGES = {
  Guerrilla: ['Cannot hold territory', 'Depends on civilian support', 'Ineffective at sea', 'Slow attrition timeline'],
  Blitzkrieg: ['Vulnerable to supply cut', 'Fails in forest/mountain', 'Requires air dominance', 'Exposed flanks'],
  Conventional: ['Predictable doctrine', 'High resource cost', 'Slow adaptation', 'Vulnerable to asymmetric response'],
  Naval: ['Limited to water environments', 'Irreplaceable losses', 'Submarine vulnerability', 'Expensive to build/maintain'],
  Siege: ['Very slow pace', 'Vulnerable to relief forces', 'Own morale erosion', 'Resource intensive'],
  Attrition: ['Destroys own forces too', 'Low morale impact on own troops', 'Politically costly', 'Long timeline'],
  Flanking: ['Complex coordination required', 'Flanks can be exposed', 'Needs mobile forces', 'Can be preempted'],
  Deception: ['One-time use per operation', 'Fails if penetrated', 'Requires intelligence dominance', 'Complex planning'],
  Psychological: ['Unpredictable results', 'May backfire', 'Context dependent', 'Hard to measure success'],
  Coalition: ['Coordination friction', 'Divergent objectives', 'Vulnerable to divide tactics', 'Alliance fragility'],
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="cyber-tooltip">
      <p className="font-semibold neon-cyan mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}: {(p.value * 100).toFixed(0)}%
        </p>
      ))}
    </div>
  )
}

export default function StrategyComparison({ conflicts = [] }) {
  const [stratA, setStratA] = useState('Blitzkrieg')
  const [stratB, setStratB] = useState('Guerrilla')

  const terrainComparisonData = useMemo(() => {
    return TERRAINS.map(terrain => ({
      terrain,
      [stratA]: STRATEGY_EFFECTIVENESS[stratA]?.[terrain] ?? 0.5,
      [stratB]: STRATEGY_EFFECTIVENESS[stratB]?.[terrain] ?? 0.5,
    }))
  }, [stratA, stratB])

  const radarData = useMemo(() => {
    return TERRAINS.map(terrain => ({
      subject: terrain,
      [stratA]: Math.round((STRATEGY_EFFECTIVENESS[stratA]?.[terrain] ?? 0.5) * 100),
      [stratB]: Math.round((STRATEGY_EFFECTIVENESS[stratB]?.[terrain] ?? 0.5) * 100),
    }))
  }, [stratA, stratB])

  const winRateData = useMemo(() => {
    const calcWinRate = (strategy) => {
      const relevant = conflicts.filter(c => c.strategy_type === strategy)
      if (!relevant.length) return { winRate: 0, total: 0, wins: 0 }
      const wins = relevant.filter(c => c.outcome === 'Victory').length
      return { winRate: wins / relevant.length, total: relevant.length, wins }
    }
    return { a: calcWinRate(stratA), b: calcWinRate(stratB) }
  }, [stratA, stratB, conflicts])

  const colorA = STRATEGY_COLORS[stratA] || '#00d4ff'
  const colorB = STRATEGY_COLORS[stratB] || '#ff3355'

  return (
    <div className="space-y-6">
      {/* Strategy selectors */}
      <div className="grid grid-cols-2 gap-6">
        {[
          { label: 'Strategy A', value: stratA, setter: setStratA, color: colorA },
          { label: 'Strategy B', value: stratB, setter: setStratB, color: colorB },
        ].map(({ label, value, setter, color }) => (
          <div key={label} className="glass-card p-4">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color }}>
              {label}
            </label>
            <select
              value={value}
              onChange={e => setter(e.target.value)}
              className="cyber-select"
              style={{ borderColor: color + '50' }}
            >
              {STRATEGIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {/* Win rate display */}
            <div className="mt-3 flex justify-between text-xs">
              <span style={{ color: '#7a9bbf' }}>Historical Win Rate</span>
              <span style={{ color }} className="font-bold">
                {value === stratA
                  ? `${(winRateData.a.winRate * 100).toFixed(0)}% (${winRateData.a.wins}/${winRateData.a.total})`
                  : `${(winRateData.b.winRate * 100).toFixed(0)}% (${winRateData.b.wins}/${winRateData.b.total})`
                }
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Radar / Spider chart */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-bold neon-cyan uppercase tracking-wider mb-4">
          📊 Terrain Effectiveness Radar
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(26,58,92,0.5)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#7a9bbf', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#4a6580', fontSize: 9 }} />
            <Radar name={stratA} dataKey={stratA} stroke={colorA} fill={colorA} fillOpacity={0.15} strokeWidth={2} />
            <Radar name={stratB} dataKey={stratB} stroke={colorB} fill={colorB} fillOpacity={0.15} strokeWidth={2} />
            <Legend />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart comparison */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-bold neon-cyan uppercase tracking-wider mb-4">
          📈 Effectiveness by Terrain (%)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={terrainComparisonData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,0.4)" />
            <XAxis dataKey="terrain" tick={{ fill: '#7a9bbf', fontSize: 11 }} />
            <YAxis domain={[0, 1]} tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fill: '#7a9bbf', fontSize: 10 }} />
            <Tooltip
              formatter={(v, name) => [`${(v * 100).toFixed(0)}%`, name]}
              contentStyle={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '6px' }}
              labelStyle={{ color: '#c8d8e8' }}
            />
            <Legend />
            <Bar dataKey={stratA} fill={colorA} radius={[3,3,0,0]} fillOpacity={0.8} />
            <Bar dataKey={stratB} fill={colorB} radius={[3,3,0,0]} fillOpacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Advantages / Disadvantages comparison */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { strategy: stratA, color: colorA },
          { strategy: stratB, color: colorB },
        ].map(({ strategy, color }) => (
          <div key={strategy} className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color }}>
              {strategy}
            </h3>
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: '#00ff88' }}>✅ Strengths</p>
              <ul className="space-y-1">
                {(STRATEGY_ADVANTAGES[strategy] || []).map((adv, i) => (
                  <li key={i} className="text-xs flex gap-1.5" style={{ color: '#7a9bbf' }}>
                    <span style={{ color: '#00ff88' }}>+</span> {adv}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: '#ff3355' }}>❌ Weaknesses</p>
              <ul className="space-y-1">
                {(STRATEGY_DISADVANTAGES[strategy] || []).map((dis, i) => (
                  <li key={i} className="text-xs flex gap-1.5" style={{ color: '#7a9bbf' }}>
                    <span style={{ color: '#ff3355' }}>−</span> {dis}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Historical examples table */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-bold neon-cyan uppercase tracking-wider mb-4">
          📜 Historical Examples
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[stratA, stratB].map((strategy, si) => {
            const color = si === 0 ? colorA : colorB
            const examples = conflicts.filter(c => c.strategy_type === strategy)
            return (
              <div key={strategy}>
                <h4 className="text-xs font-bold mb-2" style={{ color }}>{strategy}</h4>
                {examples.length === 0 ? (
                  <p className="text-xs" style={{ color: '#4a6580' }}>No historical examples in dataset.</p>
                ) : (
                  <div className="space-y-1.5">
                    {examples.slice(0, 5).map(c => (
                      <div
                        key={c.id}
                        className="p-2 rounded text-xs"
                        style={{ background: `${color}0a`, border: `1px solid ${color}20` }}
                      >
                        <div className="flex justify-between">
                          <span style={{ color: '#c8d8e8' }}>{c.name}</span>
                          <span
                            className={`outcome-${c.outcome?.toLowerCase()}`}
                            style={{ fontWeight: 600 }}
                          >
                            {c.outcome}
                          </span>
                        </div>
                        <div style={{ color: '#4a6580' }}>
                          {c.year < 0 ? `${Math.abs(c.year)} BC` : c.year} • {c.terrain}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
