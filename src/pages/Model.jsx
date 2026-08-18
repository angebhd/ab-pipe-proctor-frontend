import AsyncBoundary from '../components/AsyncBoundary'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { useAsyncData } from '../hooks/useAsyncData'
import { SEGMENT_COUNT } from '../lib/corridor'
import { modelService } from '../services/modelService'

const percent = (value) => `${Math.round(value * 100)}%`

/** A labelled count with the share it represents, drawn as a plain bar. */
function DistributionRow({ label, count, share, bar = 'bg-brand-600' }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{count}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${bar}`}
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </div>
    </li>
  )
}

function Distribution({ rows }) {
  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <DistributionRow key={row.key} {...row} />
      ))}
    </ul>
  )
}

function Model() {
  const { data, error, isLoading } = useAsyncData(modelService.getModel)

  return (
    <>
      <PageHeader
        title="Model"
        description="What the detection model is, and what it has produced so far."
      />

      <AsyncBoundary isLoading={isLoading} error={error}>
        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Detections recorded"
                value={data.output.total}
                hint="Everything the model has written to the corridor log"
              />
              <StatCard
                label="Mean confidence"
                value={data.output.total > 0 ? percent(data.output.meanConfidence) : '—'}
                hint={
                  data.output.total > 0
                    ? `Ranging ${percent(data.output.minConfidence)} to ${percent(data.output.maxConfidence)}`
                    : 'Nothing recorded yet'
                }
              />
              <StatCard
                label="Segments covered"
                value={`${data.output.segmentsCovered} of ${SEGMENT_COUNT}`}
                hint="Segments with at least one detection"
              />
              <StatCard
                label="Off corridor"
                value={data.output.offCorridor}
                hint="Recorded too far from the line to place on a segment"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card
                title="How it reads a pair"
                description={data.card.source}
                className="lg:col-span-2"
              >
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Encoder
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-900">
                      {data.card.name}
                      <span className="ml-2 font-mono text-xs font-normal text-slate-500">
                        {data.card.size}
                      </span>
                    </dd>
                  </div>

                  {data.card.spec.map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-sm text-slate-500">{label}</dt>
                      <dd className="text-right text-sm text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                  {data.card.task}. The model reports where two captures differ
                  most, not what caused the difference — the anomaly type on a
                  recorded detection is set by whoever logs it.
                </p>

                <a
                  href={data.card.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
                >
                  About the encoder
                </a>
              </Card>

              <Card
                title="Open by severity"
                description="Read from the confidence on each detection"
              >
                <Distribution rows={data.bySeverity} />
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card
                title="By anomaly type"
                description="What has been logged against the corridor"
              >
                {data.output.total > 0 ? (
                  <Distribution rows={data.byType} />
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Nothing recorded yet.
                  </p>
                )}
              </Card>

              <Card
                title="By status"
                description="Where each detection stands"
              >
                {data.output.total > 0 ? (
                  <Distribution rows={data.byStatus} />
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Nothing recorded yet.
                  </p>
                )}
              </Card>
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              Precision, recall, and training curves are not shown: the backend
              exposes no evaluation endpoint, so there is nothing measured to
              report. Everything above is counted from the detections the API
              returns.
            </p>
          </div>
        )}
      </AsyncBoundary>
    </>
  )
}

export default Model
