import { useEffect, useRef, useState } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import {
  AlertIcon,
  CheckIcon,
  MapPinIcon,
  SpinnerIcon,
  UploadIcon,
} from '../components/icons'
import {
  SEVERITY,
  formatCoords,
  formatDate,
  formatKmRange,
  formatSegment,
} from '../lib/detections'
import {
  ACCEPT_ATTRIBUTE,
  analysisService,
  formatFileSize,
  rejectionFor,
} from '../services/analysisService'
import { SEGMENTS, getSegment } from '../services/monitoringService'

const toIsoDate = (date) => date.toISOString().slice(0, 10)
const today = () => toIsoDate(new Date())

/** How often a satellite revisits the same section of pipeline. */
const REVISIT_DAYS = 6

const daysBefore = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() - days)
  return toIsoDate(date)
}

/** `2026-08-16` alone parses as UTC midnight; anchor it to the local day. */
const formatCaptureDate = (date) => formatDate(`${date}T00:00:00`)

/** What to tell someone who isn't going to read a confidence score. */
const READS = {
  high: 'A clear change was found. Worth sending someone to take a look.',
  medium: 'A change was found. Probably worth a closer look when convenient.',
  low: 'A small change was found. Most likely nothing to worry about.',
}

/**
 * `2, 13` on a 16×16 grid → "the upper right" — plain wording for where in
 * the image the model is pointing, instead of raw grid coordinates.
 */
function positionLabel(row, col) {
  const vertical = row < 5 ? 'upper' : row < 11 ? '' : 'lower'
  const horizontal = col < 5 ? 'left' : col < 11 ? '' : 'right'

  const words = [vertical, horizontal].filter(Boolean)
  return words.length > 0 ? `the ${words.join(' ')}` : 'the middle'
}

/** One before/after image slot, paired with the date it was taken. */
function CaptureField({ id, label, hint, capture, onPick, onClear, date, onDateChange }) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}

      <div className="mt-3">
        {capture ? (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <CheckIcon className="size-5" />
            </span>
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
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-7 text-center ${
              isDragging
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <UploadIcon className="size-5 text-slate-400" />
            <span className="text-sm text-slate-700">
              Drop an image here, or{' '}
              <span className="font-medium text-brand-700">browse</span>
            </span>
          </label>
        )}

        <input
          id={id}
          name={id}
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
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <label htmlFor={`${id}-date`} className="text-xs font-medium text-slate-500">
          Taken on
        </label>
        <input
          id={`${id}-date`}
          type="date"
          max={today()}
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          required
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
      </div>
    </div>
  )
}

function Result({ result }) {
  const location = formatCoords({ lat: result.latitude, lon: result.longitude })

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {SEVERITY[result.severity].label} change.  score: {' '}
          {result.anomalyScore.toFixed(2)}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          {READS[result.severity]}
        </p>
      </div>

      <p className="flex items-start gap-1.5 text-sm leading-relaxed text-slate-600">
        <MapPinIcon className="mt-0.5 size-4 shrink-0 text-slate-400" />
        The change is in {positionLabel(result.patchRow, result.patchCol)} of the
        image, near {location}.
      </p>

      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Segment
          </dt>
          <dd className="mt-1 text-sm text-slate-900" title={result.segmentId}>
            {formatSegment(result.segment)}
            <span className="ml-2 text-xs text-slate-500">
              {formatKmRange(getSegment(result.segment))}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Compared
          </dt>
          <dd className="mt-1 text-sm text-slate-900">
            {formatCaptureDate(result.referenceDate)} to{' '}
            {formatCaptureDate(result.currentDate)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * Send a before image and an after image for one pipeline segment, and
 * see what changed between them. The dates shown alongside each image are
 * for context only — the satellite's revisit cadence — and aren't sent with
 * the request.
 */
function Analysis() {
  const [reference, setReference] = useState(null)
  const [current, setCurrent] = useState(null)
  const [form, setForm] = useState({
    referenceDate: daysBefore(today(), REVISIT_DAYS),
    currentDate: today(),
    segment: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  // Object URLs outlive the component unless they are handed back, and the
  // ref keeps the live pair reachable from the unmount cleanup below.
  const capturesRef = useRef({ reference: null, current: null })

  useEffect(
    () => () => {
      const { reference: ref, current: cur } = capturesRef.current
      if (ref) URL.revokeObjectURL(ref.previewUrl)
      if (cur) URL.revokeObjectURL(cur.previewUrl)
    },
    [],
  )

  const pickReference = (nextFile) => {
    if (!nextFile) return

    const rejection = rejectionFor(nextFile)
    if (rejection) {
      setError(rejection)
      return
    }

    setError('')
    const previous = capturesRef.current.reference
    if (previous) URL.revokeObjectURL(previous.previewUrl)

    const next = { file: nextFile, previewUrl: URL.createObjectURL(nextFile) }
    capturesRef.current.reference = next
    setReference(next)
    setResult(null)
  }

  const pickCurrent = (nextFile) => {
    if (!nextFile) return

    const rejection = rejectionFor(nextFile)
    if (rejection) {
      setError(rejection)
      return
    }

    setError('')
    const previous = capturesRef.current.current
    if (previous) URL.revokeObjectURL(previous.previewUrl)

    const next = { file: nextFile, previewUrl: URL.createObjectURL(nextFile) }
    capturesRef.current.current = next
    setCurrent(next)
    setResult(null)
  }

  const clearReference = () => {
    const previous = capturesRef.current.reference
    if (previous) URL.revokeObjectURL(previous.previewUrl)
    capturesRef.current.reference = null
    setReference(null)
    setResult(null)
  }

  const clearCurrent = () => {
    const previous = capturesRef.current.current
    if (previous) URL.revokeObjectURL(previous.previewUrl)
    capturesRef.current.current = null
    setCurrent(null)
    setResult(null)
  }

  const setReferenceDate = (value) => {
    setForm((prev) => ({ ...prev, referenceDate: value }))
    setError('')
  }

  const setCurrentDate = (value) => {
    setForm((prev) => ({ ...prev, currentDate: value }))
    setError('')
  }

  const handleSegmentChange = (event) => {
    setForm((prev) => ({ ...prev, segment: event.target.value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!reference) {
      setError('Add a before image — the known-clear baseline for this segment.')
      return
    }
    if (!current) {
      setError('Add an after image — the latest satellite pass.')
      return
    }
    if (!form.segment) {
      setError('Pick which segment these images cover.')
      return
    }
    if (form.currentDate < form.referenceDate) {
      setError('The after image can’t be dated before the before image.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setResult(null)

    try {
      const segment = Number(form.segment)
      const prediction = await analysisService.analyzeImage({
        referenceFile: reference.file,
        currentFile: current.file,
        segmentId: getSegment(segment).segmentId,
      })

      const enriched = {
        ...prediction,
        segment,
        referenceDate: form.referenceDate,
        currentDate: form.currentDate,
      }

      setResult(enriched)
      setHistory((prev) => [enriched, ...prev].slice(0, 5))
    } catch (submitError) {
      setError(submitError.message ?? 'Could not compare those images. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Analysis"
        description="Upload a before and after image of one pipeline segment to see what's changed."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="lg:col-span-3">
          <Card
            title="New check"
            description="A before image, an after image, and the segment they cover"
          >
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <CaptureField
                  id="reference"
                  label="Before image"
                  hint="The known-clear baseline to compare against."
                  capture={reference}
                  onPick={pickReference}
                  onClear={clearReference}
                  date={form.referenceDate}
                  onDateChange={setReferenceDate}
                />
                <CaptureField
                  id="current"
                  label="After image"
                  hint="The newest satellite pass to check."
                  capture={current}
                  onPick={pickCurrent}
                  onClear={clearCurrent}
                  date={form.currentDate}
                  onDateChange={setCurrentDate}
                />
              </div>

              <div>
                <label htmlFor="segment" className="text-sm font-medium text-slate-700">
                  Segment
                </label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Which of the 20 pipeline segments these images cover.
                </p>
                <select
                  id="segment"
                  name="segment"
                  value={form.segment}
                  onChange={handleSegmentChange}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                >
                  <option value="">Choose a segment</option>
                  {SEGMENTS.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {`${formatSegment(segment.id)} — ${segment.country}, ${formatKmRange(segment)}`}
                    </option>
                  ))}
                </select>
              </div>
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
                {isSubmitting ? 'Comparing…' : 'Check for changes'}
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
            title="Result"
            description={
              result
                ? `${formatSegment(result.segment)}`
                : 'Nothing checked yet this session'
            }
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-slate-500">
                <SpinnerIcon className="size-4 animate-spin" strokeWidth={2.25} />
                Comparing the two images…
              </div>
            ) : result ? (
              <Result result={result} />
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                Upload both images and pick a segment to see the result here.
              </p>
            )}
          </Card>

          {history.length > 0 && (
            <Card
              title="This session"
              description="Not saved once you leave the page"
              bodyClassName=""
            >
              <ul className="divide-y divide-slate-100">
                {history.map((run) => (
                  <li
                    key={`${run.segmentId}-${run.analyzedAt}`}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${SEVERITY[run.severity].dot}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-900">
                        {formatSegment(run.segment)}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {formatCaptureDate(run.referenceDate)} to{' '}
                        {formatCaptureDate(run.currentDate)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {SEVERITY[run.severity].label} · {run.anomalyScore.toFixed(2)}
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
