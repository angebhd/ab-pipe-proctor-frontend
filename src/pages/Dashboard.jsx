import { useState } from 'react'
import { Link } from 'react-router'
import AsyncBoundary from '../components/AsyncBoundary'
import Card from '../components/Card'
import CorridorMap from '../components/CorridorMap'
import DetectionDetail from '../components/DetectionDetail'
import DetectionTable from '../components/DetectionTable'
import DetectionsTrend from '../components/DetectionsTrend'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import SeverityBars from '../components/SeverityBars'
import StatCard from '../components/StatCard'
import {
  AlertIcon,
  GaugeIcon,
  LayersIcon,
  SatelliteIcon,
} from '../components/icons'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatRelativeDays, formatSegment, isOpen } from '../lib/detections'
import { CORRIDOR_LENGTH_KM, SEGMENT_COUNT } from '../lib/corridor'
import { monitoringService } from '../services/monitoringService'
import { PATHS } from '../routes/paths'

const RECENT_COUNT = 5

function Dashboard() {
  const { data, error, isLoading } = useAsyncData(monitoringService.getOverview)
  const [selected, setSelected] = useState(null)

  const detections = data?.detections ?? []
  const active = detections.filter(isOpen)
  const highSeverity = active.filter((detection) => detection.severity === 'high')

  // Only detections that land on the corridor can be attributed to a segment,
  // so coverage is counted over those rather than over everything recorded.
  const placed = detections.filter((detection) => detection.segment != null)
  const segmentsHit = new Set(placed.map((detection) => detection.segment)).size

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Corridor health at a glance, refreshed with every satellite pass."
      />

      <AsyncBoundary isLoading={isLoading} error={error}>
        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Active detections"
                value={active.length}
                hint={`${detections.length} recorded in total`}
                icon={AlertIcon}
              />
              <StatCard
                label="High severity"
                value={highSeverity.length}
                hint={
                  highSeverity.length > 0
                    ? `Worst in ${formatSegment(highSeverity[0].segment)}`
                    : 'Nothing urgent on the corridor'
                }
                icon={GaugeIcon}
              />
              <StatCard
                label="Segments affected"
                value={`${segmentsHit} of ${SEGMENT_COUNT}`}
                hint={`Across the ${CORRIDOR_LENGTH_KM.toLocaleString('en-US')} km corridor`}
                icon={LayersIcon}
              />
              <StatCard
                label="Latest detection"
                value={
                  data.latest ? formatRelativeDays(data.latest.detectedAt) : '—'
                }
                hint={
                  data.latest
                    ? `From ${data.latest.imageId}`
                    : 'Nothing recorded yet'
                }
                icon={SatelliteIcon}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card
                title="Detections per week"
                description="Last 12 weeks across the full corridor"
                className="lg:col-span-2"
              >
                <DetectionsTrend data={data.trend} />
              </Card>

              <Card
                title="Open by severity"
                description={`${active.length} awaiting review or inspection`}
              >
                <SeverityBars detections={active} />
              </Card>
            </div>

            <Card
              title="Corridor overview"
              description={
                placed.length === detections.length
                  ? `${detections.length} detections across ${SEGMENT_COUNT} segments`
                  : `${placed.length} of ${detections.length} detections fall on the corridor`
              }
            >
              <CorridorMap
                detections={detections}
                selectedId={selected?.id}
                onSelect={setSelected}
              />
            </Card>

            <Card
              title="Recent detections"
              description="Newest first"
              bodyClassName=""
              action={
                <Link
                  to={PATHS.monitoring}
                  className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
                >
                  View all
                </Link>
              }
            >
              <DetectionTable
                detections={detections.slice(0, RECENT_COUNT)}
                onSelect={setSelected}
                emptyMessage="No detections recorded yet."
              />
            </Card>
          </div>
        )}
      </AsyncBoundary>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Detection ${selected.id.slice(0, 8)}` : ''}
        description={selected ? formatSegment(selected.segment) : ''}
      >
        {selected && <DetectionDetail detection={selected} />}
      </Modal>
    </>
  )
}

export default Dashboard
