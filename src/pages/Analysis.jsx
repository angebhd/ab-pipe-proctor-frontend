import { useEffect, useRef, useState } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { SeverityBadge } from '../components/Badge'
import {
  AlertIcon,
  CheckIcon,
  SpinnerIcon,
  UploadIcon,
} from '../components/icons'
import {
  SEVERITY,
  formatDate,
  formatKmRange,
  formatSegment,
} from '../lib/detections'
import {
  ACCEPTED_TYPES,
  ACCEPT_ATTRIBUTE,
  MAX_FILE_BYTES,
  analysisService,
  formatFileSize,
} from '../services/analysisService'
import { SEGMENTS, getSegment } from '../services/monitoringService'

const fieldClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'

const today = () => new Date().toISOString().slice(0, 10)

/** `2026-08-16` alone parses as UTC midnight; anchor it to the local day. */
const formatCaptureDate = (date) => formatDate(`${date}T00:00:00`)

/** Browsers cannot paint a GeoTIFF, so those get a placeholder instead. */
const isPreviewable = (file) => file.type !== 'image/tiff'

/**
 * Rejects what the model cannot read before a request is ever made — the file
 * picker's `accept` is a hint, and a drop bypasses it entirely.
 */
function rejectionFor(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'That file is not an image the model can read. Use PNG, JPEG, TIFF, or WebP.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return `That file is ${formatFileSize(file.size)}. The model takes up to ${formatFileSize(MAX_FILE_BYTES)}.`
  }
  return ''
}

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

function Outcome({ result }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {result.anomalyDetected ? (
          <>
            <SeverityBadge severity={result.severity} />
            <span className="text-sm font-medium text-slate-900">
              {result.type}
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-800">
            <CheckIcon className="size-4" />
            No anomaly found
          </span>
        )}
        <span className="text-xs text-slate-500">
          {Math.round(result.confidence * 100)}% confidence
        </span>
      </div>

      <p className="text-sm leading-relaxed text-slate-600">{result.note}</p>

      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Segment
          </dt>
          <dd className="mt-1 text-sm text-slate-900">
            {formatSegment(result.segment)}
            <span className="ml-2 font-mono text-xs text-slate-500">
              {formatKmRange(getSegment(result.segment))}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Captured
          </dt>
          <dd className="mt-1 text-sm text-slate-900">
            {formatCaptureDate(result.capturedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Image
          </dt>
          <dd className="mt-1 truncate text-sm text-slate-900" title={result.fileName}>
            {result.fileName}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Run
          </dt>
          <dd className="mt-1 font-mono text-sm text-slate-900">{result.id}</dd>
        </div>
      </dl>
    </div>
  )
}

/** Send one capture to the model and read back what it makes of it. */
function Analysis() {
  const [capture, setCapture] = useState(null)
  const [form, setForm] = useState({ capturedAt: today(), segment: '' })
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  // Object URLs outlive the component unless they are handed back, and the
  // ref keeps the live one reachable from the unmount cleanup below.
  const captureRef = useRef(null)

  const hold = (next) => {
    if (captureRef.current) URL.revokeObjectURL(captureRef.current.previewUrl)
    captureRef.current = next
    setCapture(next)
    setResult(null)
  }

  useEffect(
    () => () => {
      if (captureRef.current) URL.revokeObjectURL(captureRef.current.previewUrl)
    },
    [],
  )

  const accept = (nextFile) => {
    if (!nextFile) return

    const rejection = rejectionFor(nextFile)
    if (rejection) {
      setError(rejection)
      return
    }

    setError('')
    hold({ file: nextFile, previewUrl: URL.createObjectURL(nextFile) })
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    accept(event.dataTransfer.files?.[0])
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!capture) {
      setError('Choose a capture to analyse.')
      return
    }
    if (!form.segment) {
      setError('Pick the segment this capture covers.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setResult(null)

    try {
      const prediction = await analysisService.analyzeImage({
        file: capture.file,
        capturedAt: form.capturedAt,
        segment: Number(form.segment),
      })

      setResult(prediction)
      setHistory((current) => [prediction, ...current].slice(0, 5))
    } catch (submitError) {
      setError(submitError.message ?? 'The model could not read that capture.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Analysis"
        description="Send a capture to the model and get its read on one corridor segment."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="lg:col-span-3">
          <Card
            title="New analysis"
            description="One image, the date it was captured, and the segment it covers"
          >
            <div className="space-y-5">
              <Field
                label="Capture"
                hint={`PNG, JPEG, TIFF, or WebP, up to ${formatFileSize(MAX_FILE_BYTES)}.`}
                htmlFor="image"
              >
                {capture ? (
                  <div className="flex items-center gap-4 rounded-lg border border-slate-200 p-3">
                    {isPreviewable(capture.file) ? (
                      <img
                        src={capture.previewUrl}
                        alt=""
                        className="size-20 shrink-0 rounded-md bg-slate-100 object-cover"
                      />
                    ) : (
                      <span className="flex size-20 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-500">
                        TIFF
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {capture.file.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatFileSize(capture.file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => hold(null)}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="image"
                    onDragOver={(event) => {
                      event.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center ${
                      isDragging
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <UploadIcon className="size-6 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      Drop an image here, or{' '}
                      <span className="font-medium text-brand-700">browse</span>
                    </span>
                  </label>
                )}

                <input
                  id="image"
                  name="image"
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  onChange={(event) => {
                    accept(event.target.files?.[0])
                    // Clearing the input lets the same file be picked again
                    // after a Replace, which otherwise fires no change event.
                    event.target.value = ''
                  }}
                  className="sr-only"
                />
              </Field>

              <Field
                label="Capture date"
                hint="The date the satellite took this image."
                htmlFor="capturedAt"
              >
                <input
                  id="capturedAt"
                  name="capturedAt"
                  type="date"
                  max={today()}
                  value={form.capturedAt}
                  onChange={handleChange}
                  required
                  className={fieldClasses}
                />
              </Field>

              <Field
                label="Segment"
                hint="Which of the 20 corridor segments this capture covers."
                htmlFor="segment"
              >
                <select
                  id="segment"
                  name="segment"
                  value={form.segment}
                  onChange={handleChange}
                  required
                  className={fieldClasses}
                >
                  <option value="">Choose a segment</option>
                  {SEGMENTS.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {`${formatSegment(segment.id)} — ${segment.country}, ${formatKmRange(segment)}`}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-5">
              <button
                type="submit"
                disabled={isSubmitting}
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
              result ? `Run ${result.id}` : 'Nothing analysed in this session yet'
            }
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-slate-500">
                <SpinnerIcon className="size-4 animate-spin" strokeWidth={2.25} />
                Reading the capture…
              </div>
            ) : result ? (
              <Outcome result={result} />
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                Send a capture and the model&rsquo;s read appears here.
              </p>
            )}
          </Card>

          {history.length > 0 && (
            <Card
              title="This session"
              description="Runs are not saved once you leave the page"
              bodyClassName=""
            >
              <ul className="divide-y divide-slate-100">
                {history.map((run) => (
                  <li
                    key={`${run.id}-${run.analyzedAt}`}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${
                        run.anomalyDetected
                          ? SEVERITY[run.severity].dot
                          : 'bg-slate-200'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-900">
                        {run.fileName}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {formatSegment(run.segment)} ·{' '}
                        {formatCaptureDate(run.capturedAt)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {run.anomalyDetected ? run.type : 'Clear'}
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
