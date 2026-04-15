import React, { useMemo, useState } from 'react'

const ERA_ORDER = ['Ancient', 'Medieval', 'Early Modern', 'Modern', 'Contemporary']

const STRATEGY_COLORS = {
  Guerrilla: '#00ff88',
  Blitzkrieg: '#ff3355',
  Conventional: '#00d4ff',
  Naval: '#5588ff',
  Siege: '#e08020',
  Attrition: '#bb55ee',
  Flanking: '#ffb400',
  Deception: '#00c8b4',
  Psychological: '#dd44dd',
  Coalition: '#64c864',
}

function StrategyBadge({ strategy }) {
  const cls = `badge-${strategy?.toLowerCase()}`
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${cls}`}
      style={{ fontFamily: 'monospace' }}
    >
      {strategy}
    </span>
  )
}

function OutcomeIcon({ outcome }) {
  if (outcome === 'Victory') return <span className="outcome-victory font-bold text-sm">▲ WIN</span>
  if (outcome === 'Defeat') return <span className="outcome-defeat font-bold text-sm">▼ LOSS</span>
  return <span className="outcome-draw font-bold text-sm">◆ DRAW</span>
}

function EraSection({ era, conflicts }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mb-6">
      <button
        className="flex items-center gap-3 w-full text-left mb-3 group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,212,255,0.4), transparent)' }} />
        <span className="neon-cyan text-xs font-bold tracking-widest uppercase px-3">{era}</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, rgba(0,212,255,0.4), transparent)' }} />
        <span className="text-cyber-muted text-xs ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="space-y-3 pl-4 border-l-2" style={{ borderColor: 'rgba(0,212,255,0.15)' }}>
          {conflicts.map((conflict, idx) => (
            <TimelineEntry key={conflict.id || idx} conflict={conflict} />
          ))}
        </div>
      )}
    </div>
  )
}

function TimelineEntry({ conflict }) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div
      className="relative pl-6 cursor-pointer group"
      onClick={() => setShowDetail(!showDetail)}
    >
      {/* Timeline dot */}
      <div
        className="absolute left-0 top-3 w-3 h-3 rounded-full border-2 transition-all duration-200"
        style={{
          borderColor: STRATEGY_COLORS[conflict.strategy_type] || '#00d4ff',
          backgroundColor: showDetail ? (STRATEGY_COLORS[conflict.strategy_type] || '#00d4ff') : 'rgba(5,10,15,0.9)',
          transform: showDetail ? 'scale(1.3)' : 'scale(1)',
          boxShadow: showDetail ? `0 0 10px ${STRATEGY_COLORS[conflict.strategy_type] || '#00d4ff'}` : 'none',
        }}
      />
      {/* Connector line */}
      <div
        className="absolute left-1.5 top-6 w-px"
        style={{ height: showDetail ? '0' : '100%', background: 'rgba(26,58,92,0.5)' }}
      />

      <div className="glass-card p-3 group-hover:border-cyan-500/30 transition-all duration-200">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{
                  background: 'rgba(0,212,255,0.08)',
                  color: '#7a9bbf',
                  border: '1px solid rgba(0,212,255,0.15)',
                }}
              >
                {conflict.year < 0 ? `${Math.abs(conflict.year)} BC` : `${conflict.year} AD`}
              </span>
              <h3 className="text-sm font-semibold" style={{ color: '#c8d8e8' }}>
                {conflict.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs" style={{ color: '#7a9bbf' }}>
                {conflict.country_a} <span style={{ color: '#4a6580' }}>vs</span> {conflict.country_b}
              </span>
              <span className="text-xs" style={{ color: '#4a6580' }}>•</span>
              <span className="text-xs" style={{ color: '#7a9bbf' }}>{conflict.terrain}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StrategyBadge strategy={conflict.strategy_type} />
            <OutcomeIcon outcome={conflict.outcome} />
          </div>
        </div>

        {showDetail && (
          <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid rgba(26,58,92,0.5)' }}>
            <p className="text-xs leading-relaxed" style={{ color: '#7a9bbf' }}>
              {conflict.description}
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-cyber-muted">Duration:</span>{' '}
                <span className="neon-cyan">{conflict.duration_days} days</span>
              </div>
              <div>
                <span className="text-cyber-muted">Casualties:</span>{' '}
                <span className="neon-red">{conflict.casualties_estimate?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-cyber-muted">Technology:</span>{' '}
                <span style={{ color: '#c8d8e8' }}>{conflict.technology_level}</span>
              </div>
              <div>
                <span className="text-cyber-muted">Region:</span>{' '}
                <span style={{ color: '#c8d8e8' }}>{conflict.region}</span>
              </div>
            </div>
            {conflict.key_tactics?.length > 0 && (
              <div>
                <span className="text-xs font-semibold neon-gold">Key Tactics: </span>
                <span className="text-xs" style={{ color: '#7a9bbf' }}>
                  {conflict.key_tactics.join(', ')}
                </span>
              </div>
            )}
            {conflict.lessons?.length > 0 && (
              <div>
                <span className="text-xs font-semibold" style={{ color: '#00ff88' }}>Lessons:</span>
                <ul className="mt-1 space-y-0.5">
                  {conflict.lessons.map((l, i) => (
                    <li key={i} className="text-xs flex gap-1" style={{ color: '#7a9bbf' }}>
                      <span style={{ color: '#00ff88' }}>›</span> {l}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {conflict.notable_leaders?.length > 0 && (
              <div>
                <span className="text-xs font-semibold neon-cyan">Leaders: </span>
                <span className="text-xs" style={{ color: '#7a9bbf' }}>
                  {conflict.notable_leaders.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Timeline({ conflicts = [] }) {
  const [filterEra, setFilterEra] = useState('All')

  const filtered = useMemo(() => {
    return filterEra === 'All' ? conflicts : conflicts.filter(c => c.era === filterEra)
  }, [conflicts, filterEra])

  const byEra = useMemo(() => {
    const map = {}
    ERA_ORDER.forEach(era => {
      const eraConflicts = filtered
        .filter(c => c.era === era)
        .sort((a, b) => a.year - b.year)
      if (eraConflicts.length > 0) map[era] = eraConflicts
    })
    return map
  }, [filtered])

  return (
    <div>
      {/* Era filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['All', ...ERA_ORDER].map(era => (
          <button
            key={era}
            onClick={() => setFilterEra(era)}
            className="px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200"
            style={{
              background: filterEra === era ? 'rgba(0,212,255,0.15)' : 'rgba(15,37,64,0.5)',
              border: `1px solid ${filterEra === era ? 'rgba(0,212,255,0.5)' : 'rgba(26,58,92,0.5)'}`,
              color: filterEra === era ? '#00d4ff' : '#7a9bbf',
              boxShadow: filterEra === era ? '0 0 10px rgba(0,212,255,0.2)' : 'none',
            }}
          >
            {era}
          </button>
        ))}
        <span className="text-xs self-center ml-2" style={{ color: '#4a6580' }}>
          {filtered.length} conflicts
        </span>
      </div>

      {/* Timeline entries */}
      {Object.entries(byEra).map(([era, eraConflicts]) => (
        <EraSection key={era} era={era} conflicts={eraConflicts} />
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 glass-card">
          <div className="text-4xl mb-3">⚔️</div>
          <p style={{ color: '#7a9bbf' }}>No conflicts found for the selected filter.</p>
        </div>
      )}
    </div>
  )
}
