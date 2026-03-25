import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const SPECIES_ICONS = {
  elk: '🦌',
  deer: '🦌',
  antelope: '🐾',
  bear: '🐻',
  moose: '🫎',
  sheep: '🐏',
  goat: '🐐',
  default: '🎯',
}

export default function Home() {
  const [states, setStates] = useState([])
  const [selectedState, setSelectedState] = useState('')
  const [species, setSpecies] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/states')
      .then(r => r.json())
      .then(setStates)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedState) return
    setLoading(true)
    fetch(`/api/states/${selectedState}/species`)
      .then(r => r.json())
      .then(data => setSpecies(data.species || []))
      .catch(() => setSpecies([]))
      .finally(() => setLoading(false))
  }, [selectedState])

  const handleSpeciesClick = (sp) => {
    navigate(`/hunts?state=${selectedState}&species=${sp}`)
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="card bg-forest-800 text-white border-0">
        <div className="text-center py-2">
          <div className="text-5xl mb-3">🦌</div>
          <h1 className="text-2xl font-bold mb-2">Know Your Draw Odds</h1>
          <p className="text-forest-200 text-sm leading-relaxed">
            Enter your preference points and instantly see your chances of drawing
            big game tags across the western US.
          </p>
        </div>
      </div>

      {/* Quick search */}
      <div className="card space-y-4">
        <h2 className="font-bold text-stone-800">Start with a State</h2>

        {states.length === 0 ? (
          <div className="text-sm text-stone-500 text-center py-4">
            No states loaded yet.{' '}
            <a href="/admin" className="text-forest-600 underline">Import data →</a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {states.map(s => (
              <button
                key={s.code}
                onClick={() => setSelectedState(s.code)}
                className={`px-4 py-3 rounded-lg border text-left transition-all ${
                  selectedState === s.code
                    ? 'bg-forest-700 text-white border-forest-700'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-forest-400'
                }`}
              >
                <div className="font-bold">{s.code}</div>
                <div className="text-xs opacity-70">{s.name}</div>
              </button>
            ))}
          </div>
        )}

        {selectedState && !loading && species.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">Pick a species:</p>
            <div className="grid grid-cols-2 gap-2">
              {species.map(sp => (
                <button
                  key={sp}
                  onClick={() => handleSpeciesClick(sp)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-stone-200
                             hover:border-forest-400 hover:bg-forest-50 transition-all text-left"
                >
                  <span className="text-xl">
                    {SPECIES_ICONS[sp.toLowerCase()] || SPECIES_ICONS.default}
                  </span>
                  <span className="font-medium capitalize text-stone-800">{sp}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center text-stone-500 text-sm py-4">Loading species…</div>
        )}
      </div>

      {/* Browse all */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/hunts')}
          className="btn-secondary flex-1"
        >
          Browse All Hunts
        </button>
      </div>

      {/* How it works */}
      <div className="card space-y-3">
        <h2 className="font-bold text-stone-800">How It Works</h2>
        <div className="space-y-3">
          {[
            ['🔍', 'Search', 'Find a hunt by state, species, unit, or weapon type'],
            ['🎯', 'Enter Points', 'Enter your current preference points'],
            ['📊', 'See Your Odds', 'Get estimated draw odds based on historical data'],
            ['📈', 'Track Trends', 'See how points required has changed over the years'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div>
                <div className="font-semibold text-sm text-stone-800">{title}</div>
                <div className="text-xs text-stone-500">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
