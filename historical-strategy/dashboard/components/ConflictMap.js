import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Approximate coordinates for conflict locations by region/name
const CONFLICT_COORDINATES = {
  marathon_490bc: [38.15, 23.97],
  thermopylae_480bc: [38.8, 22.5],
  gaugamela_331bc: [36.5, 43.2],
  cannae_216bc: [41.3, 16.1],
  punic_wars_264bc: [37.0, 10.0],
  hastings_1066: [50.9, 0.57],
  mongol_conquest_1206: [47.9, 106.9],
  agincourt_1415: [50.46, 2.14],
  fall_constantinople_1453: [41.0, 28.98],
  hundred_years_war_1337: [46.6, 2.4],
  thirty_years_war_1618: [51.2, 10.4],
  waterloo_1815: [50.68, 4.41],
  gettysburg_1863: [39.83, -77.23],
  verdun_1916: [49.16, 5.38],
  dday_1944: [49.35, -0.6],
  stalingrad_1942: [48.7, 44.5],
  battle_britain_1940: [51.5, -1.0],
  midway_1942: [28.2, -177.4],
  inchon_1950: [37.46, 126.63],
  vietnam_war_1955: [16.1, 107.8],
  six_day_war_1967: [31.7, 35.2],
  gulf_war_1991: [29.3, 47.9],
  falklands_1982: [-51.7, -59.0],
  tet_offensive_1968: [16.07, 108.22],
  afghan_mujahideen_1979: [34.5, 69.2],
  battle_of_algiers_1956: [36.74, 3.06],
  zulu_isandlwana_1879: [-28.35, 30.65],
  kursk_1943: [51.75, 36.17],
  iwo_jima_1945: [24.78, 141.32],
  yom_kippur_1973: [30.0, 32.0],
  second_punic_war_218bc: [44.0, 7.0],
  siege_leningrad_1941: [59.95, 30.32],
}

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

const OUTCOME_COLORS = {
  Victory: '#00ff88',
  Defeat: '#ff3355',
  Draw: '#ffd700',
}

// Internal map component that uses react-leaflet (SSR disabled)
function MapInner({ conflicts }) {
  const { MapContainer, TileLayer, CircleMarker, Popup } = require('react-leaflet')
  require('leaflet/dist/leaflet.css')

  return (
    <MapContainer
      center={[30, 15]}
      zoom={2}
      style={{ height: '500px', width: '100%', background: '#050a0f' }}
      className="rounded-lg"
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        opacity={0.85}
      />
      {conflicts.map(conflict => {
        const coords = CONFLICT_COORDINATES[conflict.id]
        if (!coords) return null
        const color = STRATEGY_COLORS[conflict.strategy_type] || '#00d4ff'
        const outlineColor = OUTCOME_COLORS[conflict.outcome] || '#7a9bbf'

        return (
          <CircleMarker
            key={conflict.id}
            center={coords}
            radius={8}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.75,
              color: outlineColor,
              weight: 2,
              opacity: 0.9,
            }}
          >
            <Popup
              className="cyber-map-popup"
            >
              <div style={{
                background: 'rgba(10,22,40,0.98)',
                border: `1px solid ${color}`,
                borderRadius: '8px',
                padding: '12px',
                minWidth: '220px',
                fontFamily: 'monospace',
              }}>
                <div style={{ color: color, fontWeight: 'bold', marginBottom: '6px' }}>
                  {conflict.name}
                </div>
                <div style={{ color: '#7a9bbf', fontSize: '11px', marginBottom: '4px' }}>
                  {conflict.year < 0 ? `${Math.abs(conflict.year)} BC` : `${conflict.year} AD`} • {conflict.era}
                </div>
                <div style={{ color: '#c8d8e8', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: '#7a9bbf' }}>vs</span> {conflict.country_a} / {conflict.country_b}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span style={{
                    background: `${color}22`,
                    border: `1px solid ${color}55`,
                    color: color,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                  }}>
                    {conflict.strategy_type}
                  </span>
                  <span style={{
                    background: `${outlineColor}22`,
                    border: `1px solid ${outlineColor}55`,
                    color: outlineColor,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                  }}>
                    {conflict.outcome}
                  </span>
                </div>
                <div style={{ color: '#7a9bbf', fontSize: '11px' }}>{conflict.terrain} • {conflict.region}</div>
                <div style={{ color: '#4a6580', fontSize: '10px', marginTop: '6px', lineHeight: 1.4 }}>
                  {conflict.description?.slice(0, 100)}...
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

// Strategy legend component
function MapLegend({ activeStrategies, onToggle }) {
  return (
    <div className="glass-card p-4 mt-4">
      <h4 className="text-xs font-bold neon-cyan uppercase tracking-wider mb-3">Strategy Types</h4>
      <div className="flex flex-wrap gap-2">
        {Object.entries(STRATEGY_COLORS).map(([strategy, color]) => {
          const isActive = activeStrategies.includes(strategy)
          return (
            <button
              key={strategy}
              onClick={() => onToggle(strategy)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all duration-150"
              style={{
                background: isActive ? `${color}18` : 'rgba(15,37,64,0.3)',
                border: `1px solid ${isActive ? color + '60' : 'rgba(26,58,92,0.3)'}`,
                color: isActive ? color : '#4a6580',
                opacity: isActive ? 1 : 0.5,
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: color, boxShadow: isActive ? `0 0 6px ${color}` : 'none' }}
              />
              {strategy}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Dynamic import of map (SSR disabled)
const DynamicMap = dynamic(
  () => Promise.resolve(MapInner),
  { ssr: false, loading: () => (
    <div
      className="rounded-lg flex items-center justify-center"
      style={{ height: '500px', background: 'rgba(10,22,40,0.5)', border: '1px solid rgba(0,212,255,0.1)' }}
    >
      <div className="text-center">
        <div className="text-2xl mb-2">🗺️</div>
        <p style={{ color: '#7a9bbf' }}>Loading conflict map...</p>
      </div>
    </div>
  )}
)

export default function ConflictMap({ conflicts = [] }) {
  const [activeStrategies, setActiveStrategies] = useState(Object.keys(STRATEGY_COLORS))
  const [filterOutcome, setFilterOutcome] = useState('All')

  const filteredConflicts = conflicts.filter(c => {
    const stratOk = activeStrategies.includes(c.strategy_type)
    const outcomeOk = filterOutcome === 'All' || c.outcome === filterOutcome
    return stratOk && outcomeOk && CONFLICT_COORDINATES[c.id]
  })

  const toggleStrategy = (strategy) => {
    setActiveStrategies(prev =>
      prev.includes(strategy)
        ? prev.filter(s => s !== strategy)
        : [...prev, strategy]
    )
  }

  const conflictsWithCoords = conflicts.filter(c => CONFLICT_COORDINATES[c.id]).length

  return (
    <div>
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="text-xs" style={{ color: '#7a9bbf' }}>
          Showing{' '}
          <span className="neon-cyan font-semibold">{filteredConflicts.length}</span>
          {' '}of{' '}
          <span style={{ color: '#c8d8e8' }}>{conflictsWithCoords}</span> mapped conflicts
        </div>
        <div className="flex gap-2 ml-auto">
          {['All', 'Victory', 'Defeat', 'Draw'].map(outcome => (
            <button
              key={outcome}
              onClick={() => setFilterOutcome(outcome)}
              className="px-2 py-0.5 rounded text-xs transition-all"
              style={{
                background: filterOutcome === outcome ? 'rgba(0,212,255,0.15)' : 'rgba(15,37,64,0.4)',
                border: `1px solid ${filterOutcome === outcome ? 'rgba(0,212,255,0.4)' : 'rgba(26,58,92,0.4)'}`,
                color: filterOutcome === outcome ? '#00d4ff' : '#7a9bbf',
              }}
            >
              {outcome}
            </button>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid rgba(0,212,255,0.15)' }}
      >
        <DynamicMap conflicts={filteredConflicts} />
      </div>

      <MapLegend activeStrategies={activeStrategies} onToggle={toggleStrategy} />

      {/* Unmapped conflicts notice */}
      {conflicts.length > conflictsWithCoords && (
        <div
          className="mt-3 px-3 py-2 rounded text-xs"
          style={{
            background: 'rgba(255,215,0,0.06)',
            border: '1px solid rgba(255,215,0,0.2)',
            color: '#ffd700',
          }}
        >
          ℹ️ {conflicts.length - conflictsWithCoords} conflicts have no geographic coordinates and are not shown on the map.
        </div>
      )}
    </div>
  )
}
