import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import OddsGauge from '../components/OddsGauge'
import OddsChart from '../components/OddsChart'
import PointsBucketChart from '../components/PointsBucketChart'

const CONFIDENCE_COLORS = {
  high:   'bg-forest-100 text-forest-800',
  medium: 'bg-earth-100 text-earth-800',
  low:    'bg-red-100 text-red-800',
}

export default function HuntDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [hunt, setHunt] = useState(null)
  const [drawResults, setDrawResults] = useState([])
  const [points, setPoints] = useState(0)
  const [applicantType, setApplicantType] = useState('resident')
  const [oddsData, setOddsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [huntLoading, setHuntLoading] = useState(true)

  // Load hunt details
  useEffect(() => {
    setHuntLoading(true)
    Promise.all([
      fetch(`/api/hunts/${id}`).then(r => r.json()),
      fetch(`/api/hunts/${id}/draw-results`).then(r => r.json()),
    ])
      .then(([h, dr]) => { setHunt(h); setDrawResults(dr) })
      .catch(() => {})
      .finally(() => setHuntLoading(false))
  }, [id])

  // Fetch odds whenever inputs change
  useEffect(() => {
    if (!hunt) return
    setLoading(true)
    fetch(`/api/odds?hunt_id=${id}&points=${points}&applicant_type=${applicantType}`)
      .then(r => r.ok ? r.json() : null)
      .then(setOddsData)
      .catch(() => setOddsData(null))
      .finally(() => setLoading(false))
  }, [id, points, applicantType, hunt])

  if (huntLoading) {
    return <div className="text-center py-12 text-stone-400">Loading hunt data…</div>
  }
  if (!hunt) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-2">❌</div>
        <p className="text-stone-500">Hunt not found.</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">Go Back</button>
      </div>
    )
  }

  // Most recent draw result for the selected applicant type
  const latestResult = drawResults.find(dr => dr.applicant_type === applicantType)

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-forest-700 text-sm font-medium">
        ← Back
      </button>

      {/* Hunt header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-900">
              {hunt.state?.code} · Unit {hunt.unit}
            </h1>
            <p className="text-sm text-stone-600 capitalize">
              {hunt.species} {hunt.subspecies && `(${hunt.subspecies})`} · {hunt.weapon_type} · Season {hunt.season_number}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">{hunt.hunt_code}</p>
          </div>
          <span className="badge bg-forest-100 text-forest-800 capitalize">{hunt.hunt_type}</span>
        </div>
        {hunt.description && (
          <p className="text-sm text-stone-600 mt-2 pt-2 border-t border-stone-100">{hunt.description}</p>
        )}
      </div>

      {/* Odds calculator */}
      <div className="card space-y-4">
        <h2 className="font-bold text-stone-800">Your Draw Odds</h2>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">
              Preference Points
            </label>
            <input
              type="number"
              min={0} max={30}
              value={points}
              onChange={e => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-lg font-bold
                         text-center focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">
              Residency
            </label>
            <div className="flex rounded-lg border border-stone-300 overflow-hidden h-[42px]">
              {['resident', 'nonresident'].map(t => (
                <button
                  key={t}
                  onClick={() => setApplicantType(t)}
                  className={`flex-1 text-xs font-medium capitalize transition-colors ${
                    applicantType === t
                      ? 'bg-forest-700 text-white'
                      : 'bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {t === 'resident' ? 'Resident' : 'Non-res'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick adjust buttons */}
        <div className="flex gap-2 items-center">
          <span className="text-xs text-stone-500">Adjust:</span>
          {[-2, -1, +1, +2].map(delta => (
            <button
              key={delta}
              onClick={() => setPoints(p => Math.max(0, p + delta))}
              className="px-2 py-1 text-xs rounded border border-stone-200 hover:bg-stone-50"
            >
              {delta > 0 ? `+${delta}` : delta}
            </button>
          ))}
        </div>

        {/* Odds result */}
        {loading ? (
          <div className="text-center py-6 text-stone-400">Calculating…</div>
        ) : oddsData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <OddsGauge
                odds={oddsData.estimated_odds}
                label="Estimated draw odds"
              />
              <div className="card bg-stone-50 border-0 flex flex-col items-center justify-center text-center">
                <div className="text-2xl font-black text-earth-600">
                  {oddsData.min_points_to_draw ?? '—'}
                </div>
                <div className="text-xs text-stone-500">Min pts to draw</div>
              </div>
              <div className={`card border-0 flex flex-col items-center justify-center text-center ${CONFIDENCE_COLORS[oddsData.confidence]}`}>
                <div className="text-sm font-bold capitalize">{oddsData.confidence}</div>
                <div className="text-xs opacity-75">Confidence</div>
              </div>
            </div>

            {/* What it means */}
            <div className="bg-forest-50 rounded-lg p-3 text-sm">
              {oddsData.estimated_odds !== null ? (
                <p className="text-stone-700">
                  With <strong>{points} preference points</strong> as a{' '}
                  <strong>{applicantType}</strong>, you have an estimated{' '}
                  <strong className="text-forest-700">{oddsData.estimated_odds_pct}</strong> chance
                  of drawing this tag.
                  {oddsData.min_points_to_draw !== null && points < oddsData.min_points_to_draw && (
                    <span className="text-orange-600">
                      {' '}You're <strong>{oddsData.min_points_to_draw - points} points short</strong> of the recent draw minimum.
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-stone-500">
                  No draw result data available for {applicantType} applicants. Try switching residency type.
                </p>
              )}
            </div>

            {/* Historical odds chart */}
            {oddsData.history?.length > 1 && (
              <OddsChart history={oddsData.history} points={points} />
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-stone-400 text-sm">
            No draw data available for {applicantType} applicants.
          </div>
        )}
      </div>

      {/* Point bucket breakdown */}
      {latestResult && latestResult.point_buckets?.length > 0 && (
        <div className="card">
          <PointsBucketChart
            buckets={latestResult.point_buckets}
            userPoints={points}
            tagsAvailable={latestResult.tags_available}
          />
        </div>
      )}

      {/* Raw stats table */}
      {drawResults.filter(dr => dr.applicant_type === applicantType).length > 0 && (
        <div className="card space-y-2">
          <h3 className="font-bold text-stone-800 text-sm">Historical Draw Data</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-stone-600">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-2 font-semibold">Year</th>
                  <th className="text-right py-2 font-semibold">Tags</th>
                  <th className="text-right py-2 font-semibold">Applicants</th>
                  <th className="text-right py-2 font-semibold">Min Pts</th>
                  <th className="text-right py-2 font-semibold">Odds</th>
                </tr>
              </thead>
              <tbody>
                {drawResults
                  .filter(dr => dr.applicant_type === applicantType)
                  .sort((a, b) => b.year - a.year)
                  .map(dr => (
                    <tr key={dr.id} className="border-b border-stone-100">
                      <td className="py-2 font-medium">{dr.year}</td>
                      <td className="text-right py-2">{dr.tags_available ?? '—'}</td>
                      <td className="text-right py-2">{dr.total_applicants ?? '—'}</td>
                      <td className="text-right py-2">{dr.min_points_drawn ?? '—'}</td>
                      <td className="text-right py-2">
                        {dr.overall_odds != null
                          ? `${(dr.overall_odds * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
