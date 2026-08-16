/**
 * Mock inference for the analysis page: takes one capture, its date, and the
 * corridor segment it covers, and answers with what the model would report.
 *
 * TODO: swap `analyzeImage` for a multipart `apiClient` call once the backend
 * exposes the model — the payload is already the three fields the endpoint is
 * expected to take (`image`, `captured_at`, `segment`). Nothing here touches
 * the network, so every result below is fabricated, not a measurement.
 */

import { SEGMENT_COUNT } from './monitoringService'

const MOCK_DELAY_MS = 1400

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const MAX_FILE_BYTES = 15 * 1024 * 1024

/** GeoTIFF sits alongside the ordinary web formats: SAR tiles arrive as TIFF. */
export const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/tiff',
  'image/webp',
]

export const ACCEPT_ATTRIBUTE = '.png,.jpg,.jpeg,.tif,.tiff,.webp,image/*'

const ANOMALY_TYPES = [
  'Ground disturbance',
  'Excavation',
  'Vehicle cluster',
  'New access track',
  'Encroachment',
]

/** FNV-1a, so the same capture on the same segment always scores the same. */
function hash(value) {
  let result = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }

  return result >>> 0
}

const severityFor = (confidence) => {
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.7) return 'medium'
  return 'low'
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const analysisService = {
  /**
   * @param {{ file: File, capturedAt: string, segment: number }} submission
   *   `capturedAt` is a `YYYY-MM-DD` date, `segment` a 1-based segment number.
   */
  analyzeImage: async ({ file, capturedAt, segment }) => {
    if (!file) {
      throw new Error('Choose a capture to analyse.')
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(
        `That file is ${formatFileSize(file.size)}. The model takes up to ${formatFileSize(MAX_FILE_BYTES)}.`,
      )
    }
    if (!capturedAt) {
      throw new Error('Give the date the image was captured.')
    }
    if (!(segment >= 1 && segment <= SEGMENT_COUNT)) {
      throw new Error(`Pick a segment between 1 and ${SEGMENT_COUNT}.`)
    }

    await wait(MOCK_DELAY_MS)

    const seed = hash(`${file.name}:${file.size}:${capturedAt}:${segment}`)
    const anomalyDetected = (seed % 1000) / 1000 >= 0.35
    const confidence = anomalyDetected
      ? 0.55 + ((seed >>> 8) % 430) / 1000
      : 0.62 + ((seed >>> 8) % 350) / 1000
    const area = (0.2 + ((seed >>> 16) % 90) / 100).toFixed(1)

    return {
      id: `AN-${String(seed % 10000).padStart(4, '0')}`,
      fileName: file.name,
      fileSize: file.size,
      segment,
      capturedAt,
      analyzedAt: new Date().toISOString(),
      anomalyDetected,
      type: anomalyDetected ? ANOMALY_TYPES[seed % ANOMALY_TYPES.length] : null,
      severity: anomalyDetected ? severityFor(confidence) : null,
      confidence,
      note: anomalyDetected
        ? `Change signature across roughly ${area} ha inside segment ${segment}, no matching work order.`
        : `No change beyond seasonal variation across segment ${segment}.`,
    }
  },
}
