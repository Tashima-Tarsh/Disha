import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, 
} from 'recharts'

const Timeline = dynamic(() => import('../components/Timeline'), { ssr: false })
const ConflictMap = dynamic(() => import('../components/ConflictMap'), { ssr: false })
const StrategyComparison = dynamic(() => import('../components/StrategyComparison'), { ssr: false })
const SimulationPanel = dynamic(() => import('../components/SimulationPanel'), { ssr: false })
const StatsPanel = dynamic(() => import('../components/StatsPanel'), { ssr: false })

const TABS = ['Overview', 'Timeline', 'Strategy Map', 'Simulation', 'Compare']

const STRATEGY_COLORS = {
  Guerrilla: '#00ff88', Blitzkrieg: '#ff3355', Conventional: '#00d4ff',
  Naval: '#5588ff', Siege: '#e08020', Attrition: '#bb55ee',
  Flanking: '#ffb400', Deception: '#00c8b4', Psychological: '#dd44dd',
  Coalition: '#64c864',
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative w-16 h-16">
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: '#00d4ff',
            animation: 'spin 1s linear infinite',
          }}
        />
        <div
          className="absolute inset-2 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: '#ffd700',
            animation: 'spin 0.8s linear infinite reverse',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl">⚔️</span>
        </div>
      </div>
      <p className="mt-4 neon-cyan text-sm tracking-wider animate-pulse">Accessing Intelligence Database...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color = '#00d4ff' }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7a9bbf' }}>{label}</p>
          <p className="text-3xl font-bold font-mono" style={{ color }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: '#4a6580' }}>{sub}</p>}
        </div>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
    </div>
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

function OutcomeChip({ outcome }) {
  const map = { Victory: '#00ff88', Defeat: '#ff3355', Draw: '#ffd700' }
  const color = map[outcome] || '#7a9bbf'
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-xs font-bold"
      style={{ color, background: `${color}18` }}
    >
      {outcome === 'Victory' ? '▲' : outcome === 'Defeat' ? '▼' : '◆'} {outcome}
    </span>
  )
}

function OverviewTab({ conflicts, stats }) {
  const topStrategies = useMemo(() => {
    if (!stats?.strategy_win_rates) return []
    return Object.entries(stats.strategy_win_rates)
      .map(([strategy, data]) => ({
        strategy,
        win_rate: data.win_rate,
        total: data.total,
      }))
      .sort((a, b) => b.win_rate - a.win_rate)
  }, [stats])

  const timelineData = useMemo(() => {
    if (!conflicts.length) return []
    const byEra = {}
    conflicts.forEach(c => {
      byEra[c.era] = (byEra[c.era] || 0) + 1
    })
    return [
      { era: 'Ancient', count: byEra['Ancient'] || 0 },
      { era: 'Medieval', count: byEra['Medieval'] || 0 },
      { era: 'Early Modern', count: byEra['Early Modern'] || 0 },
      { era: 'Modern', count: byEra['Modern'] || 0 },
      { era: 'Contemporary', count: byEra['Contemporary'] || 0 },
    ]
  }, [conflicts])

  const recentConflicts = useMemo(() => {
    return [...conflicts].sort((a, b) => b.year - a.year).slice(0, 8)
  }, [conflicts])

  const uniqueRegions = useMemo(() => new Set(conflicts.map(c => c.region)).size, [conflicts])
  const uniqueStrategies = useMemo(() => new Set(conflicts.map(c => c.strategy_type)).size, [conflicts])
  const uniqueEras = useMemo(() => new Set(conflicts.map(c => c.era)).size, [conflicts])

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="⚔️" label="Total Conflicts" value={conflicts.length} sub="Historical records" color="#00d4ff" />
        <StatCard icon="📅" label="Eras Covered" value={uniqueEras} sub="Ancient to Contemporary" color="#ffd700" />
        <StatCard icon="🗺️" label="Regions" value={uniqueRegions} sub="Worldwide coverage" color="#00ff88" />
        <StatCard icon="🎯" label="Strategies" value={uniqueStrategies} sub="Distinct approaches" color="#bb55ee" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Win Rates */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-bold neon-cyan uppercase tracking-wider mb-4">🏆 Strategy Win Rates</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topStrategies} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,0.3)" horizontal={false} />
              <XAxis type="number" domain={[0, 1]} tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fill: '#7a9bbf', fontSize: 10 }} />
              <YAxis type="category" dataKey="strategy" width={90} tick={{ fill: '#7a9bbf', fontSize: 10 }} />
              <Tooltip
                formatter={v => `${(v*100).toFixed(0)}%`}
                contentStyle={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '6px' }}
                labelStyle={{ color: '#c8d8e8' }}
              />
              <Bar dataKey="win_rate" name="Win Rate" radius={[0,3,3,0]}>
                {topStrategies.map(entry => (
                  <Cell key={entry.strategy} fill={STRATEGY_COLORS[entry.strategy] || '#00d4ff'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conflicts per Era */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-bold neon-gold uppercase tracking-wider mb-4">📊 Conflicts per Era</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,0.3)" />
              <XAxis dataKey="era" tick={{ fill: '#7a9bbf', fontSize: 10 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fill: '#7a9bbf', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '6px' }}
                labelStyle={{ color: '#ffd700' }}
              />
              <Bar dataKey="count" name="Conflicts" fill="#ffd700" fillOpacity={0.7} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent conflicts table */}
      <div className="glass-card p-5">
        <h3 className="text-xs font-bold neon-cyan uppercase tracking-wider mb-4">📋 Most Recent Conflicts</h3>
        <div className="overflow-x-auto">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Conflict</th>
                <th>Sides</th>
                <th>Strategy</th>
                <th>Terrain</th>
                <th>Outcome</th>
                <th>Casualties</th>
              </tr>
            </thead>
            <tbody>
              {recentConflicts.map(c => (
                <tr key={c.id}>
                  <td className="font-mono text-xs" style={{ color: '#7a9bbf' }}>
                    {c.year < 0 ? `${Math.abs(c.year)} BC` : c.year}
                  </td>
                  <td className="font-semibold" style={{ color: '#c8d8e8', maxWidth: '160px' }}>
                    <span className="line-clamp-1">{c.name}</span>
                  </td>
                  <td className="text-xs" style={{ color: '#7a9bbf' }}>
                    {c.country_a} <span style={{ color: '#4a6580' }}>vs</span> {c.country_b}
                  </td>
                  <td><StrategyBadge strategy={c.strategy_type} /></td>
                  <td className="text-xs" style={{ color: '#7a9bbf' }}>{c.terrain}</td>
                  <td><OutcomeChip outcome={c.outcome} /></td>
                  <td className="text-xs font-mono" style={{ color: '#ff3355' }}>
                    {c.casualties_estimate?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [conflicts, setConflicts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('checking')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [conflictsRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/timeline`),
          fetch(`${API_URL}/api/stats`),
        ])
        if (!conflictsRes.ok) throw new Error(`API error: ${conflictsRes.status}`)
        const conflictsData = await conflictsRes.json()
        const statsData = await statsRes.json()
        setConflicts(conflictsData.timeline || [])
        setStats(statsData)
        setApiStatus('online')
      } catch (err) {
        setError(err.message)
        setApiStatus('offline')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [API_URL])

  return (
    <div className="min-h-screen cyber-grid-bg">
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(5,10,15,0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0,212,255,0.15)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚔️</span>
              <div>
                <h1 className="text-base font-bold neon-cyan tracking-wide leading-none">
                  Historical Strategy Intelligence
                </h1>
                <p className="text-xs" style={{ color: '#4a6580' }}>AI-Powered Military Analysis System</p>
              </div>
            </div>

            {/* API Status */}
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: apiStatus === 'online' ? '#00ff88' : apiStatus === 'offline' ? '#ff3355' : '#ffd700',
                  boxShadow: `0 0 6px ${apiStatus === 'online' ? '#00ff88' : apiStatus === 'offline' ? '#ff3355' : '#ffd700'}`,
                  animation: apiStatus === 'checking' ? 'pulse 1s infinite' : undefined,
                }}
              />
              <span className="text-xs font-mono" style={{ color: '#7a9bbf' }}>
                API {apiStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`nav-tab${activeTab === tab ? ' active' : ''}`}
              >
                {tab === 'Overview' && '📊 '}
                {tab === 'Timeline' && '📅 '}
                {tab === 'Strategy Map' && '🗺️ '}
                {tab === 'Simulation' && '⚔️ '}
                {tab === 'Compare' && '📈 '}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="glass-card p-8 text-center max-w-lg mx-auto mt-16">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold neon-red mb-2">Connection Failed</h2>
            <p className="text-sm mb-4" style={{ color: '#7a9bbf' }}>
              Cannot connect to API at <code className="neon-cyan">{API_URL}</code>
            </p>
            <p className="text-xs mb-4" style={{ color: '#4a6580' }}>{error}</p>
            <div
              className="p-3 rounded text-xs text-left"
              style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}
            >
              <p className="neon-cyan font-semibold mb-1">To start the API:</p>
              <code className="block text-xs" style={{ color: '#c8d8e8' }}>
                cd historical-strategy<br />
                pip install -r requirements.txt<br />
                uvicorn api.main:app --port 8001
              </code>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'Overview' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold neon-cyan mb-1">Intelligence Overview</h2>
                  <p className="text-sm" style={{ color: '#7a9bbf' }}>
                    Analyzing {conflicts.length} historical conflicts from{' '}
                    {conflicts.length > 0 ? `${Math.abs(conflicts[0]?.year)} BC to ${conflicts[conflicts.length - 1]?.year} AD` : '—'}
                  </p>
                </div>
                <OverviewTab conflicts={conflicts} stats={stats} />
              </div>
            )}

            {activeTab === 'Timeline' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold neon-gold mb-1">⚔️ Historical Timeline</h2>
                  <p className="text-sm" style={{ color: '#7a9bbf' }}>
                    Chronological view of {conflicts.length} conflicts from ancient to modern era.
                    Click any conflict to expand details.
                  </p>
                </div>
                <Timeline conflicts={conflicts} />
              </div>
            )}

            {activeTab === 'Strategy Map' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-1" style={{ color: '#5588ff' }}>🗺️ Global Conflict Map</h2>
                  <p className="text-sm" style={{ color: '#7a9bbf' }}>
                    Geographic distribution of historical conflicts. Colors indicate strategy type.
                    Click markers for conflict details.
                  </p>
                </div>
                <ConflictMap conflicts={conflicts} />
              </div>
            )}

            {activeTab === 'Simulation' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold neon-red mb-1">⚔️ Battle Simulator</h2>
                  <p className="text-sm" style={{ color: '#7a9bbf' }}>
                    Model historical and hypothetical battle scenarios. Adjust parameters to see
                    predicted outcomes based on historical strategy patterns.
                  </p>
                </div>
                <SimulationPanel />
              </div>
            )}

            {activeTab === 'Compare' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-1" style={{ color: '#00c8b4' }}>📊 Strategy Comparison</h2>
                  <p className="text-sm" style={{ color: '#7a9bbf' }}>
                    Head-to-head comparison of military strategies across all terrain types,
                    historical examples, and tactical considerations.
                  </p>
                </div>
                <StrategyComparison conflicts={conflicts} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 text-center" style={{ borderTop: '1px solid rgba(26,58,92,0.4)' }}>
        <p className="text-xs" style={{ color: '#4a6580' }}>
          Historical Strategy Intelligence System · {conflicts.length} conflicts analyzed ·
          <span className="neon-cyan ml-1">AI-Powered</span>
        </p>
      </footer>
    </div>
  )
}
