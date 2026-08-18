import { SeverityBadge, StatusBadge } from './Badge'
import {
  anomalyTypeLabel,
  formatCoords,
  formatDate,
  formatKmRange,
  formatSegment,
} from '../lib/detections'
import { getSegment } from '../lib/corridor'

function Field({ label, children, mono = false }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`mt-1 text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}
      >
        {children}
      </dd>
    </div>
  )
}

/** Body of the detection dialog. */
function DetectionDetail({ detection }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={detection.severity} />
        <StatusBadge status={detection.status} />
        <span className="text-xs text-slate-500">
          {Math.round(detection.confidence * 100)}% confidence
        </span>
      </div>

      {detection.segment == null && (
        <p className="text-sm leading-relaxed text-slate-600">
          These coordinates sit {Math.round(detection.offsetKm).toLocaleString('en-US')} km
          off the corridor, too far to place on a segment.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-4">
        <Field label="Segment">{formatSegment(detection.segment)}</Field>
        <Field label="Segment span" mono>
          {formatKmRange(getSegment(detection.segment))}
        </Field>
        <Field label="Coordinates" mono>
          {formatCoords(detection.coords)}
        </Field>
        <Field label="Type">{anomalyTypeLabel(detection.type)}</Field>
        <Field label="Detected">{formatDate(detection.detectedAt)}</Field>
        <Field label="Source image" mono>
          {detection.imageId}
        </Field>
        <Field label="Detection ID" mono>
          {detection.id}
        </Field>
        <Field label="Last updated">{formatDate(detection.updatedAt)}</Field>
      </dl>
    </div>
  )
}

export default DetectionDetail
