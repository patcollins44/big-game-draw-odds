/**
 * Visual odds gauge — shows probability as a colored arc + big percentage.
 */
export default function OddsGauge({ odds, label }) {
  if (odds === null || odds === undefined) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="text-3xl font-bold text-stone-400">N/A</div>
        {label && <div className="text-xs text-stone-500">{label}</div>}
      </div>
    )
  }

  const pct = Math.round(odds * 100)

  const color =
    pct >= 50 ? 'text-forest-600' :
    pct >= 20 ? 'text-earth-500' :
    pct >= 5  ? 'text-orange-500' :
                'text-red-500'

  const bgColor =
    pct >= 50 ? 'bg-forest-100' :
    pct >= 20 ? 'bg-earth-100' :
    pct >= 5  ? 'bg-orange-100' :
                'bg-red-100'

  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl p-4 ${bgColor}`}>
      <div className={`text-4xl font-black ${color}`}>{pct}%</div>
      {label && <div className="text-xs text-stone-600 mt-1 text-center">{label}</div>}
    </div>
  )
}
