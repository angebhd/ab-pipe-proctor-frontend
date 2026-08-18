import { SeverityBadge, StatusBadge } from './Badge'
import {
  anomalyTypeLabel,
  formatKmRange,
  formatRelativeDays,
  formatSegment,
} from '../lib/detections'
import { getSegment } from '../lib/corridor'

const cell = 'px-4 py-3 text-sm'

/** Shared between the dashboard (recent rows) and the monitoring view. */
function DetectionTable({ detections, onSelect, emptyMessage = 'No detections match these filters.' }) {
  if (detections.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-4 py-2.5 font-medium">Detection</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Segment</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Severity</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Detected</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {detections.map((detection) => (
            <tr
              key={detection.id}
              onClick={() => onSelect?.(detection)}
              className={onSelect ? 'cursor-pointer hover:bg-slate-50' : undefined}
            >
              {/* Detection ids are uuids; the leading block is enough to
                  recognise a row, and the dialog shows the whole thing. */}
              <td className={`${cell} font-mono text-slate-900`} title={detection.id}>
                {detection.id.slice(0, 8)}
              </td>
              <td className={cell}>
                <span className="block text-slate-900">
                  {formatSegment(detection.segment)}
                </span>
                <span className="block font-mono text-xs text-slate-500">
                  {formatKmRange(getSegment(detection.segment))}
                </span>
              </td>
              <td className={`${cell} text-slate-600`}>
                {anomalyTypeLabel(detection.type)}
              </td>
              <td className={cell}>
                <SeverityBadge severity={detection.severity} />
              </td>
              <td className={cell}>
                <StatusBadge status={detection.status} />
              </td>
              <td className={`${cell} text-slate-500`}>
                {formatRelativeDays(detection.detectedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DetectionTable
