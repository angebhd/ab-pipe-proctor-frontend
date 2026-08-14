import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const axisTick = { fontSize: 12, fill: '#94a3b8' }

// Validation is the series that matters, so it carries the accent and
// training recedes into grey.
const SERIES = [
  { key: 'validation', label: 'Validation', color: 'var(--color-brand-600)', dot: 'bg-brand-600' },
  { key: 'train', label: 'Training', color: '#64748b', dot: 'bg-slate-500' },
]

function CurveTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs text-slate-500">Epoch {label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm text-slate-900">
          <span className="text-slate-500">
            {entry.dataKey === 'validation' ? 'Validation' : 'Training'}:{' '}
          </span>
          <span className="font-semibold tabular-nums">
            {entry.value.toFixed(2)}
          </span>
        </p>
      ))}
    </div>
  )
}

/** F1 per epoch, validation against training. */
function TrainingCurve({ data }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        {SERIES.map(({ key, label, dot }) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${dot}`} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="epoch"
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            tickMargin={8}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tickFormatter={(value) => value.toFixed(2)}
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            width={56}
          />
          <Tooltip
            content={<CurveTooltip />}
            cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
          />
          {SERIES.map(({ key, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TrainingCurve
