import React, { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const ERA_COLORS = {
  Ancient: '#ffd700',
  Medieval: '#bb55ee',
  'Early Modern': '#e08020',
  Modern: '#00d4ff',
  Contemporary: '#00ff88',
}

const STRATEGY_COLORS = {
  Guerrilla: '#00ff88', Blitzkrieg: '#ff3355', Conventional: '#00d4ff',
  Naval: '#5588ff', Siege: '#e08020', Attrition: '#bb55ee',
  Flanking: '#ffb400', Deception: '#00c8b4', Psychological: '#dd44dd',
  Coalition: '#64c864',
}

const REGION_COLORS = {
  Europe: '#00d4ff', Asia: '#ffd700', 'Middle East': '#ff8800',
  Americas: '#00ff88', Africa: '#bb55ee', Global: '#ff3355',
}

const TERRAIN_COLORS = {
  Plains: '#ffd700', Desert: '#ff8800', Mountains: '#00ff88',
  Forest: '#00c8b4', Urban: '#bb55ee', Sea: '#5588ff',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="cyber-tooltip text-xs">
      <p className="font-semibold mb-1" style={{ color: '#c8d8e8' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value < 2 ? `${(p.value * 100).toFixed(0)}%` : p.value}
        </p>
      ))}
    </div>
  )
}

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="cyber-tooltip text-xs">
      <p style={{ color: '#c8d8e8' }}>{name}: <span className="neon-cyan">{value}</span></p>
    </div>
  )
}

function CardTitle({ children }) {
  return (
    <h3 className="text-xs font-bold neon-cyan uppercase tracking-wider mb-4">{children}</h3>
  )
}

export default function StatsPanel({ conflicts = [] }) {
  const eraData = useMemo(() => {
    const counts = {}
    conflicts.forEach(c => {
      counts[c.era] = (counts[c.era] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [conflicts])

  const strategyWinRates = useMemo(() => {
    const data = {}
    conflicts.forEach(c => {
      if (!data[c.strategy_type]) data[c.strategy_type] = { wins: 0, total: 0 }
      data[c.strategy_type].total++
      if (c.outcome === 'Victory') data[c.strategy_type].wins++
    })
    return Object.entries(data)
      .map(([strategy, { wins, total }]) => ({
        strategy,
        win_rate: total > 0 ? wins / total : 0,
        total,
        wins,
      }))
      .sort((a, b) => b.win_rate - a.win_rate)
  }, [conflicts])

  const regionData = useMemo(() => {
    const counts = {}
    conflicts.forEach(c => {
      counts[c.region] = (counts[c.region] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [conflicts])

  const terrainOutcomeData = useMemo(() => {
    const data = {}
    conflicts.forEach(c => {
      if (!data[c.terrain]) data[c.terrain] = { Victory: 0, Defeat: 0, Draw: 0, total: 0 }
      data[c.terrain][c.outcome] = (data[c.terrain][c.outcome] || 0) + 1
      data[c.terrain].total++
    })
    return Object.entries(data)
      .map(([terrain, counts]) => ({
        terrain,
        Victory: counts.total ? ((counts.Victory || 0) / counts.total) : 0,
        Defeat: counts.total ? ((counts.Defeat || 0) / counts.total) : 0,
        Draw: counts.total ? ((counts.Draw || 0) / counts.total) : 0,
      }))
  }, [conflicts])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Conflicts by Era - Pie Chart */}
      <div className="glass-card p-5">
        <CardTitle>🕰️ Conflicts by Era</CardTitle>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={eraData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {eraData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={ERA_COLORS[entry.name] || '#7a9bbf'}
                  stroke="rgba(5,10,15,0.8)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend
              formatter={(value) => (
                <span style={{ color: ERA_COLORS[value] || '#7a9bbf', fontSize: '11px' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="text-center -mt-2">
          <span className="text-xs" style={{ color: '#4a6580' }}>Total: </span>
          <span className="neon-cyan font-bold">{conflicts.length}</span>
        </div>
      </div>

      {/* Strategy Win Rates - Horizontal Bar Chart */}
      <div className="glass-card p-5">
        <CardTitle>🏆 Strategy Win Rates</CardTitle>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={strategyWinRates}
            layout="vertical"
            margin={{ left: 10, right: 20, top: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,0.3)" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 1]}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: '#7a9bbf', fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="strategy"
              width={90}
              tick={{ fill: '#7a9bbf', fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="win_rate" name="Win Rate" radius={[0, 3, 3, 0]}>
              {strategyWinRates.map((entry) => (
                <Cell
                  key={entry.strategy}
                  fill={STRATEGY_COLORS[entry.strategy] || '#00d4ff'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conflicts by Region - Bar Chart */}
      <div className="glass-card p-5">
        <CardTitle>🌍 Conflicts by Region</CardTitle>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={regionData} margin={{ left: 0, right: 10, top: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,0.3)" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#7a9bbf', fontSize: 10 }}
              angle={-25}
              textAnchor="end"
            />
            <YAxis tick={{ fill: '#7a9bbf', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '6px' }}
              labelStyle={{ color: '#c8d8e8' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Bar dataKey="value" name="Conflicts" radius={[4, 4, 0, 0]}>
              {regionData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={REGION_COLORS[entry.name] || '#7a9bbf'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Terrain Impact on Outcomes - Grouped Bar Chart */}
      <div className="glass-card p-5">
        <CardTitle>⛰️ Terrain Impact on Outcomes</CardTitle>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={terrainOutcomeData} margin={{ left: 0, right: 10, top: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,0.3)" />
            <XAxis
              dataKey="terrain"
              tick={{ fill: '#7a9bbf', fontSize: 10 }}
              angle={-25}
              textAnchor="end"
            />
            <YAxis
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: '#7a9bbf', fontSize: 10 }}
            />
            <Tooltip
              formatter={(v) => `${(v * 100).toFixed(0)}%`}
              contentStyle={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '6px' }}
              labelStyle={{ color: '#c8d8e8' }}
              itemStyle={{ fontSize: '11px' }}
            />
            <Legend
              formatter={value => <span style={{ fontSize: '11px', color: value === 'Victory' ? '#00ff88' : value === 'Defeat' ? '#ff3355' : '#ffd700' }}>{value}</span>}
            />
            <Bar dataKey="Victory" fill="#00ff88" fillOpacity={0.7} radius={[2,2,0,0]} />
            <Bar dataKey="Defeat" fill="#ff3355" fillOpacity={0.7} radius={[2,2,0,0]} />
            <Bar dataKey="Draw" fill="#ffd700" fillOpacity={0.7} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
