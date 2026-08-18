/**
 * Detections, straight from `/api/v1/detections`.
 *
 * The API returns flat records (`latitude`, `anomaly_type`, `anomaly_status`,
 * …). `toDetection` is the single place that shape becomes the one the UI
 * works in — a corridor segment, a severity, and camelCase timestamps. The
 * weekly trend is counted from those same records rather than fetched, because
 * the API has no aggregate endpoint.
 */

import { apiClient } from './apiClient'
import { locateOnCorridor } from '../lib/corridor'
import { severityFor } from '../lib/detections'

const TREND_WEEKS = 12
const WEEK_MS = 7 * 86_400_000

/** Midnight UTC on the Monday of that instant's week. */
function startOfWeek(date) {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
  // getUTCDay() is 0 on Sunday, which belongs to the week that began six days
  // earlier rather than the one starting the next day.
  const daysSinceMonday = (start.getUTCDay() + 6) % 7
  start.setUTCDate(start.getUTCDate() - daysSinceMonday)
  return start
}

const weekLabel = (date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** One API record → the detection the rest of the app passes around. */
export function toDetection(record) {
  const coords = { lat: record.latitude, lon: record.longitude }
  const { segment, offsetKm } = locateOnCorridor(coords)

  return {
    id: record.id,
    type: record.anomaly_type,
    status: record.anomaly_status,
    confidence: record.confidence,
    severity: severityFor(record.confidence),
    detectedAt: record.detected_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    imageId: record.image_id,
    coords,
    segment,
    offsetKm,
  }
}

/**
 * Detection counts per week for the last `TREND_WEEKS`, oldest first. Weeks
 * with nothing in them still appear, so the gaps between passes stay visible.
 */
export function weeklyTrend(detections, now = new Date()) {
  const currentWeek = startOfWeek(now)
  const firstWeek = new Date(currentWeek.getTime() - (TREND_WEEKS - 1) * WEEK_MS)

  const counts = new Map()
  for (const detection of detections) {
    const week = startOfWeek(new Date(detection.detectedAt))
    if (week < firstWeek || week > currentWeek) continue
    counts.set(week.getTime(), (counts.get(week.getTime()) ?? 0) + 1)
  }

  return Array.from({ length: TREND_WEEKS }, (_, index) => {
    const week = new Date(firstWeek.getTime() + index * WEEK_MS)
    return { week: weekLabel(week), detections: counts.get(week.getTime()) ?? 0 }
  })
}

/** Newest first, which is the order every list in the app wants. */
const byNewest = (a, b) => new Date(b.detectedAt) - new Date(a.detectedAt)

async function fetchDetections(params) {
  const query = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, value]) => value != null && value !== ''),
  ).toString()

  const records = await apiClient.get(`/api/v1/detections${query ? `?${query}` : ''}`)
  return (records ?? []).map(toDetection).sort(byNewest)
}

export const monitoringService = {
  /** The full detection list for the monitoring view. */
  getDetections: (params) => fetchDetections(params),

  getDetection: async (id) => toDetection(await apiClient.get(`/api/v1/detections/${id}`)),

  /** Everything the dashboard needs, from the one list endpoint that exists. */
  getOverview: async () => {
    const detections = await fetchDetections()

    return {
      detections,
      trend: weeklyTrend(detections),
      latest: detections[0] ?? null,
    }
  },

  /** Move a detection along: detected → investigating → resolved. */
  updateStatus: async (id, anomalyStatus) =>
    toDetection(
      await apiClient.patch(`/api/v1/detections/${id}/status`, {
        anomaly_status: anomalyStatus,
      }),
    ),

  /** Record a detection the model produced. */
  createDetection: async ({ latitude, longitude, anomalyType, confidence, detectedAt, imageId }) =>
    toDetection(
      await apiClient.post('/api/v1/detections', {
        latitude,
        longitude,
        anomaly_type: anomalyType,
        confidence,
        detected_at: detectedAt,
        image_id: imageId,
      }),
    ),
}
