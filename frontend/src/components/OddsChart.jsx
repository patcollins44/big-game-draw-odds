import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend
} from 'recharts'

export default function OddsChart({ history, points }) {
  if (!history || history.length === 0) return null

  const data = [...history].reverse().map(h => ({
    year: h.year,
    odds: h.odds,
    minPts: h.min_points_drawn,
    tags: h.tags_available,
    applicants: h.total_applicants,
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div className="bg-white border border-stone-200 rounded-lg shadow-lg p-3 text-sm">
        <div className="font-bold text-stone-800 mb-1">{label}</div>
        <div className="text-forest-700 font-semibold">
          Odds at {points} pts: {d.odds !== null ? `${d.odds}%` : 'N/A'}
        </div>
        <div className="text-stone-500">Min pts to draw: {d.minPts ?? 'N/A'}</div>
        <div className="text-stone-500">Tags: {d.tags ?? 'N/A'}</div>
        <div className="text-stone-500">Applicants: {d.applicants ?? 'N/A'}</div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-700 mb-3">
        Historical Odds at {points} Preference Points
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="odds"
            name="Draw Odds"
            stroke="#16a34a"
            strokeWidth={2.5}
            dot={{ fill: '#16a34a', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="minPts"
            name="Min Points Drawn"
            stroke="#d97b1c"
            strokeWidth={2}
            dot={{ fill: '#d97b1c', r: 4 }}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center mt-2 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-forest-600"></span> Draw Odds %
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-earth-500 border-dashed"></span> Min Pts Drawn
        </span>
      </div>
    </div>
  )
}
