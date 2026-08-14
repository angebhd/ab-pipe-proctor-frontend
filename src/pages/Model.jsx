import AsyncBoundary from '../components/AsyncBoundary'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import TrainingCurve from '../components/TrainingCurve'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatDate } from '../lib/detections'
import { modelService } from '../services/modelService'

const percent = (value) => `${Math.round(value * 100)}%`

function Model() {
  const { data, error, isLoading } = useAsyncData(modelService.getModel)

  return (
    <>
      <PageHeader
        title="Model"
        description="What the detection model is, and how well it currently performs."
      />

      <AsyncBoundary isLoading={isLoading} error={error}>
        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Precision"
                value={percent(data.headline.precision)}
                hint="Of everything flagged, how much was real"
              />
              <StatCard
                label="Recall"
                value={percent(data.headline.recall)}
                hint="Of everything real, how much was caught"
              />
              <StatCard
                label="F1"
                value={data.headline.f1.toFixed(2)}
                hint="Balance of the two"
              />
              <StatCard
                label="IoU"
                value={data.headline.iou.toFixed(2)}
                hint="Overlap of predicted and true areas"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card
                title="F1 per epoch"
                description="Fine-tuning run pp-ft-0.3"
                className="lg:col-span-2"
              >
                <TrainingCurve data={data.curve} />
              </Card>

              <Card
                title="Base model"
                description={data.card.source}
              >
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Model
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-900">
                      {data.card.name}
                      <span className="ml-2 font-mono text-xs font-normal text-slate-500">
                        {data.card.version}
                      </span>
                    </dd>
                  </div>

                  {data.card.spec.map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-sm text-slate-500">{label}</dt>
                      <dd className="text-right text-sm text-slate-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <a
                  href={data.card.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
                >
                  View on Hugging Face
                </a>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card
                title="Performance by anomaly type"
                description="Scored on the held-out test split"
                className="lg:col-span-2"
                bodyClassName=""
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-112 border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th scope="col" className="px-5 py-2.5 font-medium">
                          Type
                        </th>
                        <th scope="col" className="px-5 py-2.5 text-right font-medium">
                          Precision
                        </th>
                        <th scope="col" className="px-5 py-2.5 text-right font-medium">
                          Recall
                        </th>
                        <th scope="col" className="px-5 py-2.5 text-right font-medium">
                          Tiles
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.classes.map((row) => (
                        <tr key={row.label}>
                          <td className="px-5 py-3 text-sm text-slate-900">
                            {row.label}
                          </td>
                          <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-600">
                            {row.precision.toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-600">
                            {row.recall.toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-500">
                            {row.support}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card
                title="Training data"
                description={`${data.dataset.tilePairs} labelled tile pairs`}
              >
                <dl className="space-y-3">
                  {data.dataset.splits.map(({ label, tiles }) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-sm text-slate-500">{label}</dt>
                      <dd className="text-sm tabular-nums text-slate-900">
                        {tiles} tiles
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                  {data.card.status} · last fine-tuned{' '}
                  {formatDate(data.card.trainedOn)}. Figures are placeholders
                  until the training pipeline reports real runs.
                </p>
              </Card>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </>
  )
}

export default Model
