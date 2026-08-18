/**
 * Display metadata for a detection, and the small amount of interpretation the
 * API leaves to the client.
 *
 * The backend stores `anomaly_type` and `anomaly_status` as fixed enums and
 * reports a `confidence`; it has no notion of severity. Both the enum labels
 * and the severity rule live here so pages, tables, charts, and the corridor
 * map all read a detection the same way.
 */

/** Ordered high → low, which is the order the UI lists them in. */
export const SEVERITY_KEYS = ['high', 'medium', 'low']

export const SEVERITY = {
  high: {
    label: 'High',
    bar: 'bg-severity-high',
    dot: 'bg-severity-high',
    pill: 'bg-red-50 text-red-700 ring-red-200',
  },
  medium: {
    label: 'Medium',
    bar: 'bg-severity-medium',
    dot: 'bg-severity-medium',
    pill: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  low: {
    label: 'Low',
    bar: 'bg-severity-low',
    dot: 'bg-severity-low',
    pill: 'bg-brand-50 text-brand-800 ring-brand-200',
  },
}

/**
 * Severity is not stored: it is a reading of the model's confidence, applied
 * consistently so a "high" in the table means the same as a "high" on the map.
 */
export const SEVERITY_THRESHOLDS = { high: 0.85, medium: 0.7 }

export function severityFor(confidence) {
  if (confidence >= SEVERITY_THRESHOLDS.high) return 'high'
  if (confidence >= SEVERITY_THRESHOLDS.medium) return 'medium'
  return 'low'
}

/** `anomaly_status` values, in the order a detection moves through them. */
export const STATUS_KEYS = ['detected', 'investigating', 'resolved']

export const STATUS = {
  detected: { label: 'Detected', pill: 'bg-slate-100 text-slate-700 ring-slate-200' },
  investigating: { label: 'Investigating', pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
  resolved: { label: 'Resolved', pill: 'bg-brand-50 text-brand-800 ring-brand-200' },
}

/** A detection still needs attention until someone resolves it. */
export const isOpen = (detection) => detection.status !== 'resolved'

/** `anomaly_type` values the API accepts. */
export const ANOMALY_TYPE_KEYS = ['oil_spill', 'land_excavation', 'fire_outbreak']

export const ANOMALY_TYPES = {
  oil_spill: { label: 'Oil spill' },
  land_excavation: { label: 'Land excavation' },
  fire_outbreak: { label: 'Fire outbreak' },
}

/** Falls back to the raw value so an enum added server-side still renders. */
export const anomalyTypeLabel = (type) => ANOMALY_TYPES[type]?.label ?? type

/**
 * The highest severity present in a set of detections, or `null` when the set
 * is empty. Relies on `SEVERITY_KEYS` already being ordered high → low.
 */
export function worstSeverity(detections) {
  return (
    SEVERITY_KEYS.find((key) =>
      detections.some((detection) => detection.severity === key),
    ) ?? null
  )
}

/** `11` → `Segment 11` — the corridor position, as operators refer to it. */
export function formatSegment(segment) {
  return segment == null ? 'Off corridor' : `Segment ${segment}`
}

/** The kilometres a segment spans, for the rare place the raw span matters. */
export function formatKmRange(segment) {
  if (!segment) return '—'
  const km = (value) => Math.round(value).toLocaleString('en-US')
  return `KM ${km(segment.startKm)}–${km(segment.endKm)}`
}

export function formatCoords({ lat, lon }) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(3)}° ${ns}, ${Math.abs(lon).toFixed(3)}° ${ew}`
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** Coarse "3 days ago" for lists — detections arrive at most twice a week. */
export function formatRelativeDays(iso, now = Date.now()) {
  const days = Math.round((new Date(iso).getTime() - now) / 86_400_000)
  return relative.format(days, 'day')
}
