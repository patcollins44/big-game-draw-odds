import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts'

/**
 * Shows applicant distribution by preference points for a single year,
 * highlighting the user's point level.
 */
export default function PointsBucketChart({ buckets, userPoints, tagsAvailable }) {
  if (!buckets || buckets.length === 0) return null

  const data = buckets.map(b => ({
    points: b.points === 0 ? '0 pts' : `${b.points} pts`,
    rawPoints: b.points,
    applicants: b.applicants,
    successful: b.successful,
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    const successRate = d.applicants > 0
      ? Math.round((d.successful / d.applicants) * 100)
      : 0
    return (
      <div className="bg-white border border-stone-200 rounded-lg shadow-lg p-3 text-sm">
        <div className="font-bold text-stone-800 mb-1">{label}</div>
        <div className="text-stone-600">Applicants: {d.applicants}</div>
        <div className="text-forest-600">Successful: {d.successful}</div>
        <div className="text-stone-500">Draw rate: {successRate}%</div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-700 mb-1">
        Applicants by Point Level (Most Recent Year)
      </h3>
      {tagsAvailable && (
        <p className="text-xs text-stone-500 mb-3">
          {tagsAvailable} tags available · Your point level highlighted
        </p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="points" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="applicants" radius={[3, 3, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.rawPoints}
                fill={
                  entry.rawPoints === userPoints
                    ? '#16a34a'
                    : entry.successful > 0
                    ? '#86efac'
                    : '#d6d3d1'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center mt-2 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-forest-600"></span> Your level
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-forest-300"></span> Drew tags
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-stone-300"></span> Did not draw
        </span>
      </div>
    </div>
  )
}
