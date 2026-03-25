import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const WEAPON_ICONS = { rifle: '🔫', archery: '🏹', muzzleloader: '💨' }
const SPECIES_ICONS = { elk: '🦌', deer: '🦌', antelope: '🐾', bear: '🐻', moose: '🫎', sheep: '🐏', goat: '🐐' }

export default function HuntList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [hunts, setHunts] = useState([])
  const [loading, setLoading] = useState(false)

  const state = searchParams.get('state') || ''
  const species = searchParams.get('species') || ''
  const weapon = searchParams.get('weapon') || ''
  const unit = searchParams.get('unit') || ''

  const navigate = useNavigate()

  const fetchHunts = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (state) params.set('state', state)
    if (species) params.set('species', species)
    if (weapon) params.set('weapon_type', weapon)
    if (unit) params.set('unit', unit)
    fetch(`/api/hunts?${params}`)
      .then(r => r.json())
      .then(setHunts)
      .catch(() => setHunts([]))
      .finally(() => setLoading(false))
  }, [state, species, weapon, unit])

  useEffect(() => { fetchHunts() }, [fetchHunts])

  const update = (key, val) => {
    const next = new URLSearchParams(searchParams)
    if (val) next.set(key, val)
    else next.delete(key)
    setSearchParams(next)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-stone-800">Hunt Search</h1>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">State</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 uppercase"
              placeholder="CO, WY…"
              value={state}
              onChange={e => update('state', e.target.value.toUpperCase())}
              maxLength={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">Species</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="elk, deer…"
              value={species}
              onChange={e => update('species', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">Unit</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="Unit #"
              value={unit}
              onChange={e => update('unit', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">Weapon</label>
            <select
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white"
              value={weapon}
              onChange={e => update('weapon', e.target.value)}
            >
              <option value="">Any</option>
              <option value="rifle">Rifle</option>
              <option value="archery">Archery</option>
              <option value="muzzleloader">Muzzleloader</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8 text-stone-400">Loading hunts…</div>
      ) : hunts.length === 0 ? (
        <div className="text-center py-8 text-stone-400">
          <div className="text-4xl mb-2">🔍</div>
          <p>No hunts found. Try adjusting your filters or{' '}
            <a href="/admin" className="text-forest-600 underline">import data</a>.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-stone-500">{hunts.length} hunt{hunts.length !== 1 ? 's' : ''} found</p>
          {hunts.map(hunt => (
            <button
              key={hunt.id}
              onClick={() => navigate(`/hunts/${hunt.id}`)}
              className="card w-full text-left hover:border-forest-400 hover:shadow-md transition-all active:bg-forest-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-xl mt-0.5">
                    {SPECIES_ICONS[hunt.species?.toLowerCase()] || '🎯'}
                  </span>
                  <div>
                    <div className="font-semibold text-stone-800 text-sm">
                      Unit {hunt.unit} · {hunt.state?.code}
                    </div>
                    <div className="text-xs text-stone-600 capitalize">
                      {hunt.species} {hunt.subspecies && `(${hunt.subspecies})`}
                      {' · '}Season {hunt.season_number}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">{hunt.hunt_code}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="badge bg-stone-100 text-stone-700">
                    {WEAPON_ICONS[hunt.weapon_type] || ''} {hunt.weapon_type}
                  </span>
                  {hunt.description && (
                    <span className="text-xs text-stone-400 text-right max-w-[120px] line-clamp-1">
                      {hunt.description}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
