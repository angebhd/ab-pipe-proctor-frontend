import { useCallback, useMemo, useState } from 'react'
import AsyncBoundary from '../components/AsyncBoundary'
import Card from '../components/Card'
import CorridorMap from '../components/CorridorMap'
import DetectionDetail from '../components/DetectionDetail'
import DetectionTable from '../components/DetectionTable'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { SearchIcon, SpinnerIcon } from '../components/icons'
import { useAsyncData } from '../hooks/useAsyncData'
import {
  ANOMALY_TYPE_KEYS,
  SEVERITY,
  SEVERITY_KEYS,
  STATUS,
  STATUS_KEYS,
  anomalyTypeLabel,
  formatSegment,
} from '../lib/detections'
import { SEGMENTS } from '../lib/corridor'
import { monitoringService } from '../services/monitoringService'
import { stringifyApiError } from '../services/apiClient'

const selectClasses =
  'rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'

/** The status a detection moves to next, or `null` once it is resolved. */
const NEXT_STATUS = {
  detected: { status: 'investigating', label: 'Start investigation' },
  investigating: { status: 'resolved', label: 'Mark resolved' },
  resolved: null,
}

function matches(detection, { query, segment, severity, status, type }) {
  if (segment !== 'all') {
    const wanted = segment === 'off' ? null : Number(segment)
    if (detection.segment !== wanted) return false
  }
  if (severity !== 'all' && detection.severity !== severity) return false
  if (status !== 'all' && detection.status !== status) return false
  if (type !== 'all' && detection.type !== type) return false
  if (!query) return true

  const haystack =
    `${detection.id} ${formatSegment(detection.segment)} ${anomalyTypeLabel(detection.type)} ${detection.imageId}`.toLowerCase()
  return haystack.includes(query.trim().toLowerCase())
}

function Monitoring() {
  const { data, error, isLoading } = useAsyncData(monitoringService.getDetections)
  // Status changes come back from the API one detection at a time; they are
  // held here and laid over the fetched list rather than refetching it.
  const [updated, setUpdated] = useState({})
  const [filters, setFilters] = useState({
    query: '',
    segment: 'all',
    severity: 'all',
    status: 'all',
    type: 'all',
  })
  const [selected, setSelected] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')

  const detections = useMemo(
    () => (data ?? []).map((detection) => updated[detection.id] ?? detection),
    [data, updated],
  )

  const visible = useMemo(
    () => detections.filter((detection) => matches(detection, filters)),
    [detections, filters],
  )

  const update = (key) => (event) =>
    setFilters((current) => ({ ...current, [key]: event.target.value }))

  const closeDialog = useCallback(() => {
    setSelected(null)
    setUpdateError('')
  }, [])

  const advanceStatus = async () => {
    const next = NEXT_STATUS[selected.status]
    if (!next) return

    setIsUpdating(true)
    setUpdateError('')

    try {
      const record = await monitoringService.updateStatus(selected.id, next.status)
      setUpdated((current) => ({ ...current, [record.id]: record }))
      setSelected(null)
    } catch (statusError) {
      setUpdateError(
        stringifyApiError(statusError?.message ?? 'Could not update this detection.'),
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const nextStatus = selected ? NEXT_STATUS[selected.status] : null

  return (
    <>
      <PageHeader
        title="Monitoring"
        description="Every anomaly the model has flagged along the corridor."
      />

      <AsyncBoundary isLoading={isLoading} error={error}>
        {data && (
          <div className="space-y-6">
            <Card
              title="Corridor"
              description="Segments are coloured by what is open in them; select one to see it"
            >
              <CorridorMap
                detections={visible}
                selectedId={selected?.id}
                onSelect={setSelected}
              />
            </Card>

            <Card bodyClassName="">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                <div className="relative min-w-56 flex-1">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={filters.query}
                    onChange={update('query')}
                    placeholder="Search by ID, segment, type, or image"
                    aria-label="Search detections"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                  />
                </div>

                <select
                  value={filters.segment}
                  onChange={update('segment')}
                  aria-label="Filter by segment"
                  className={selectClasses}
                >
                  <option value="all">All segments</option>
                  {SEGMENTS.map(({ id }) => (
                    <option key={id} value={id}>
                      {formatSegment(id)}
                    </option>
                  ))}
                  <option value="off">Off corridor</option>
                </select>

                <select
                  value={filters.type}
                  onChange={update('type')}
                  aria-label="Filter by anomaly type"
                  className={selectClasses}
                >
                  <option value="all">All types</option>
                  {ANOMALY_TYPE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {anomalyTypeLabel(key)}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.severity}
                  onChange={update('severity')}
                  aria-label="Filter by severity"
                  className={selectClasses}
                >
                  <option value="all">All severities</option>
                  {SEVERITY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {SEVERITY[key].label}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.status}
                  onChange={update('status')}
                  aria-label="Filter by status"
                  className={selectClasses}
                >
                  <option value="all">All statuses</option>
                  {STATUS_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {STATUS[key].label}
                    </option>
                  ))}
                </select>

                <p className="ml-auto text-sm text-slate-500">
                  {visible.length} of {detections.length}
                </p>
              </div>

              <DetectionTable
                detections={visible}
                onSelect={setSelected}
                emptyMessage={
                  detections.length === 0
                    ? 'No detections recorded yet.'
                    : 'No detections match these filters.'
                }
              />
            </Card>
          </div>
        )}
      </AsyncBoundary>

      <Modal
        open={Boolean(selected)}
        onClose={closeDialog}
        title={selected ? `Detection ${selected.id.slice(0, 8)}` : ''}
        description={selected ? formatSegment(selected.segment) : ''}
        footer={
          <>
            {updateError && (
              <span role="alert" className="mr-auto text-sm text-red-700">
                {updateError}
              </span>
            )}

            <button
              type="button"
              onClick={closeDialog}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>

            {nextStatus && (
              <button
                type="button"
                onClick={advanceStatus}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {isUpdating && (
                  <SpinnerIcon className="size-4 animate-spin" strokeWidth={2.25} />
                )}
                {nextStatus.label}
              </button>
            )}
          </>
        }
      >
        {selected && <DetectionDetail detection={selected} />}
      </Modal>
    </>
  )
}

export default Monitoring
