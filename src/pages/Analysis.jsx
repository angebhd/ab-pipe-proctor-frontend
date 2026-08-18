import { useState } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import {
  AlertIcon,
  CheckIcon,
  SpinnerIcon,
  UploadIcon,
} from '../components/icons'
import {
  ANOMALY_TYPE_KEYS,
  anomalyTypeLabel,
  formatCoords,
  formatKmRange,
  formatSegment,
} from '../lib/detections'
import { SEGMENTS, coordsAtKm, getSegment } from '../lib/corridor'
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_BYTES,
  PATCH_GRID,
  analysisService,
  formatFileSize,
  rejectionFor,
} from '../services/analysisService'
import { monitoringService } from '../services/monitoringService'
import { stringifyApiError } from '../services/apiClient'

const fieldClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'

const today = () => new Date().toISOString().slice(0, 10)

function Field({ label, hint, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

/**
 * One half of the capture pair. GeoTIFFs cannot be painted by the browser, so
 * the slot shows the file rather than a thumbnail of it.
 */
function CaptureSlot({ id, label, hint, file, error, onPick, onClear }) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <Field label={label} hint={hint} htmlFor={id}>
      {file ? (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 p-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-500">
            TIFF
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Replace
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            onPick(event.dataTransfer.files?.[0])
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center ${
            isDragging
              ? 'border-brand-500 bg-brand-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}
        >
          <UploadIcon className="size-6 text-slate-400" />
          <span className="text-sm text-slate-700">
            Drop a GeoTIFF here, or{' '}
            <span className="font-medium text-brand-700">browse</span>
          </span>
          <span className="text-xs text-slate-500">
            Sentinel-1 .tif or .tiff, 2 bands (VV + VH), 128 × 128 px
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-red-700">
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <input
        id={id}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          onPick(event.target.files?.[0])
          // Clearing the input lets the same file be picked again after a
          // Replace, which otherwise fires no change event.
          event.target.value = ''
        }}
        className="sr-only"
      />
    </Field>
  )
}

/**
 * The model's raw output. The score is not a probability — it is the strongest
 * patch-level change plus twice its spread — so it is shown as the number it
 * is, next to the patch it came from.
 */
function Outcome({ result }) {
  const segment = getSegment(result.segment)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Anomaly score
        </p>
        <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
          {result.anomalyScore.toFixed(3)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Largest patch change plus twice its standard deviation. Higher means
          the two captures disagree more.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Segment</dt>
          <dd className="mt-1 text-sm text-slate-900">
            {formatSegment(result.segment)}
            {segment && (
              <span className="ml-2 font-mono text-xs text-slate-500">
                {formatKmRange(segment)}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Coordinates
          </dt>
          <dd className="mt-1 font-mono text-sm text-slate-900">
            {formatCoords(result.coords)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Changed patch
          </dt>
          <dd className="mt-1 font-mono text-sm text-slate-900">
            row {result.patch.row}, col {result.patch.col}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Patch index
          </dt>
          <dd className="mt-1 font-mono text-sm text-slate-900">
            {result.patch.index} of {PATCH_GRID ** 2 - 1}
          </dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * Turns a run into a stored detection.
 *
 * Two things are the operator's call rather than the model's. The model
 * reports a change, not a cause, so the anomaly type is chosen here; and the
 * score is clamped into the 0–1 the API stores as `confidence`, which is a
 * crude mapping — the score is not a probability.
 *
 * The stored coordinates are the corridor position of the chosen segment, not
 * the coordinates the model echoes back. The chip set covers a 20 km pilot
 * strip that stands in for the whole 1,950 km corridor, so every chip's true
 * coordinates fall inside the last segment. Filing by raw coordinates would
 * bury every recorded detection in segment 20 no matter which segment was
 * analysed. The chip's real position is preserved in `image_id`.
 */
function RecordDetection({ result, onRecorded }) {
  const [form, setForm] = useState({
    anomalyType: ANOMALY_TYPE_KEYS[0],
    detectedAt: today(),
    imageId: result.currentName,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      const segment = getSegment(result.segment)
      const filedAt = coordsAtKm((segment.startKm + segment.endKm) / 2)

      const detection = await monitoringService.createDetection({
        latitude: filedAt.lat,
        longitude: filedAt.lon,
        anomalyType: form.anomalyType,
        confidence: Math.min(1, Math.max(0, result.anomalyScore)),
        detectedAt: new Date(`${form.detectedAt}T00:00:00Z`).toISOString(),
        imageId: form.imageId,
      })
      setSaved(detection)
      onRecorded?.(detection)
    } catch (saveError) {
      setError(stringifyApiError(saveError?.message ?? 'Could not record this detection.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (saved) {
    return (
      <p className="inline-flex items-start gap-1.5 text-sm text-brand-800">
        <CheckIcon className="mt-0.5 size-4 shrink-0" />
        Recorded as {saved.id.slice(0, 8)} on {formatSegment(saved.segment)} — find
        it in monitoring.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Anomaly type" htmlFor="anomalyType">
        <select
          id="anomalyType"
          name="anomalyType"
          value={form.anomalyType}
          onChange={handleChange}
          className={fieldClasses}
        >
          {ANOMALY_TYPE_KEYS.map((key) => (
            <option key={key} value={key}>
              {anomalyTypeLabel(key)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Capture date" htmlFor="detectedAt">
        <input
          id="detectedAt"
          name="detectedAt"
          type="date"
          max={today()}
          value={form.detectedAt}
          onChange={handleChange}
          required
          className={fieldClasses}
        />
      </Field>

      <Field label="Image ID" hint="How this capture is referenced." htmlFor="imageId">
        <input
          id="imageId"
          name="imageId"
          value={form.imageId}
          onChange={handleChange}
          required
          className={fieldClasses}
        />
      </Field>

      <p className="text-xs leading-relaxed text-slate-500">
        Filed against {formatSegment(result.segment)} on the corridor. The
        model&rsquo;s own chip coordinates ({formatCoords(result.coords)}) are kept
        in the image ID.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {isSaving && <SpinnerIcon className="size-4 animate-spin" strokeWidth={2.25} />}
          Record detection
        </button>

        {error && (
          <span role="alert" className="text-sm text-red-700">
            {error}
          </span>
        )}
      </div>
    </form>
  )
}

/** Send a capture pair to the model and read back what changed between them. */
function Analysis() {
  const [files, setFiles] = useState({ reference: null, current: null })
  const [slotErrors, setSlotErrors] = useState({ reference: '', current: '' })
  const [segment, setSegment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  const pick = (slot) => (nextFile) => {
    if (!nextFile) return

    const rejection = rejectionFor(nextFile)
    setSlotErrors((current) => ({ ...current, [slot]: rejection }))
    if (rejection) return

    setError('')
    setResult(null)
    setFiles((current) => ({ ...current, [slot]: nextFile }))
  }

  const clear = (slot) => () => {
    setResult(null)
    setSlotErrors((current) => ({ ...current, [slot]: '' }))
    setFiles((current) => ({ ...current, [slot]: null }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!segment) {
      setError('Pick the segment these captures cover.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setResult(null)

    try {
      const prediction = await analysisService.detectChange({
        referenceFile: files.reference,
        currentFile: files.current,
        segment: Number(segment),
      })

      setResult(prediction)
      setHistory((current) => [prediction, ...current].slice(0, 5))
    } catch (submitError) {
      setError(
        stringifyApiError(submitError?.message ?? 'The model could not read that pair.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Analysis"
        description="Send a pair of captures to the model and get its read on one corridor segment."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="lg:col-span-3">
          <Card
            title="New analysis"
            description="Two captures of the same segment, and the segment they cover"
          >
            <div className="space-y-5">
              <CaptureSlot
                id="reference-image"
                label="Reference capture"
                hint="The earlier pass, taken as the baseline."
                file={files.reference}
                error={slotErrors.reference}
                onPick={pick('reference')}
                onClear={clear('reference')}
              />

              <CaptureSlot
                id="current-image"
                label="Current capture"
                hint={`The pass to compare against it, up to ${formatFileSize(MAX_FILE_BYTES)}.`}
                file={files.current}
                error={slotErrors.current}
                onPick={pick('current')}
                onClear={clear('current')}
              />

              <Field
                label="Segment"
                hint="Which of the 20 corridor segments the pair covers. The model looks its coordinates up by this ID."
                htmlFor="segment"
              >
                <select
                  id="segment"
                  name="segment"
                  value={segment}
                  onChange={(event) => {
                    setSegment(event.target.value)
                    setError('')
                  }}
                  required
                  className={fieldClasses}
                >
                  <option value="">Choose a segment</option>
                  {SEGMENTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {`${formatSegment(item.id)} — ${item.country}, ${formatKmRange(item)}`}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-5">
              <button
                type="submit"
                disabled={isSubmitting || !files.reference || !files.current}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 disabled:opacity-60"
              >
                {isSubmitting && (
                  <SpinnerIcon className="size-4 animate-spin" strokeWidth={2.25} />
                )}
                {isSubmitting ? 'Analysing…' : 'Run analysis'}
              </button>

              {error && (
                <span
                  role="alert"
                  className="inline-flex items-start gap-1.5 text-sm text-red-700"
                >
                  <AlertIcon className="mt-0.5 size-4 shrink-0" />
                  {error}
                </span>
              )}
            </div>
          </Card>
        </form>

        <div className="space-y-6 lg:col-span-2">
          <Card
            title="Model output"
            description={
              result
                ? `${result.referenceName} → ${result.currentName}`
                : 'Nothing analysed in this session yet'
            }
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-slate-500">
                <SpinnerIcon className="size-4 animate-spin" strokeWidth={2.25} />
                Comparing the captures…
              </div>
            ) : result ? (
              <Outcome result={result} />
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                Send a pair and the model&rsquo;s read appears here.
              </p>
            )}
          </Card>

          {result && (
            <Card
              title="Log this run"
              description="Save it as a detection so it shows up on the corridor"
            >
              <RecordDetection key={result.analyzedAt} result={result} />
            </Card>
          )}

          {history.length > 0 && (
            <Card
              title="This session"
              description="Runs are not saved once you leave the page"
              bodyClassName=""
            >
              <ul className="divide-y divide-slate-100">
                {history.map((run) => (
                  <li
                    key={run.analyzedAt}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-900">
                        {run.currentName}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {formatSegment(run.segment)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-slate-500">
                      {run.anomalyScore.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

export default Analysis
