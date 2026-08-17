/**
 * Change-detection inference for the analysis page: send a reference (baseline)
 * capture and a current (latest pass) capture for one corridor segment, and
 * read back where the model sees the strongest change.
 *
 * Wraps `POST /api/v1/change-detection`, documented in
 * `backend/CHANGE_DETECTION_API.md`. That endpoint takes exactly
 * `reference_image`, `current_image`, and `segment_id` (multipart) and
 * returns `{ segment_id, anomaly_score, longitude, latitude, patch_index,
 * patch_row, patch_col }` — no capture dates, no severity label. The latter
 * is derived here so the rest of the app can keep using the shared
 * `SEVERITY` keys.
 */

import { apiClient } from './apiClient'

export const MAX_FILE_BYTES = 15 * 1024 * 1024

/** The model only accepts GeoTIFF SAR chips (2 bands, VV + VH). */
export const ACCEPTED_TYPES = ['image/tiff', 'image/tif']
export const ACCEPT_ATTRIBUTE = '.tif,.tiff,image/tiff'

/**
 * `.tif`/`.tiff` MIME sniffing is unreliable across browsers and OSes (many
 * report `application/octet-stream` or nothing at all), so acceptance is
 * decided by extension; the backend still enforces content-type itself.
 */
const TIFF_EXTENSION = /\.tiff?$/i

const severityFor = (anomalyScore) => {
  if (anomalyScore >= 1.5) return 'high'
  if (anomalyScore >= 0.8) return 'medium'
  return 'low'
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Rejects what the model cannot read before a request is ever made — the
 * file picker's `accept` is a hint, and a drop bypasses it entirely.
 */
export function rejectionFor(file) {
  if (!TIFF_EXTENSION.test(file.name)) {
    return 'That file is not a TIFF. The model reads GeoTIFF SAR chips (.tif/.tiff) only.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return `That file is ${formatFileSize(file.size)}. The model takes up to ${formatFileSize(MAX_FILE_BYTES)}.`
  }
  return ''
}

export const analysisService = {
  /**
   * @param {{ referenceFile: File, currentFile: File, segmentId: string }} submission
   *   `segmentId` is the model's own id for the segment (e.g.
   *   `P1328_SEG_0020`), sourced from `SEGMENTS` in `monitoringService` —
   *   never guessed or reconstructed here.
   */
  analyzeImage: async ({ referenceFile, currentFile, segmentId }) => {
    if (!referenceFile) {
      throw new Error('Choose a reference capture — the known-clear baseline for this segment.')
    }
    if (!currentFile) {
      throw new Error('Choose a current capture — the latest satellite pass to compare.')
    }
    for (const file of [referenceFile, currentFile]) {
      const rejection = rejectionFor(file)
      if (rejection) throw new Error(rejection)
    }
    if (!segmentId) {
      throw new Error('Pick the segment these captures cover.')
    }

    const formData = new FormData()
    formData.append('reference_image', referenceFile)
    formData.append('current_image', currentFile)
    formData.append('segment_id', segmentId)

    const response = await apiClient.post('/api/v1/change-detection', formData)

    return {
      segmentId: response.segment_id,
      anomalyScore: response.anomaly_score,
      severity: severityFor(response.anomaly_score),
      latitude: response.latitude,
      longitude: response.longitude,
      patchIndex: response.patch_index,
      patchRow: response.patch_row,
      patchCol: response.patch_col,
      referenceFileName: referenceFile.name,
      currentFileName: currentFile.name,
      analyzedAt: new Date().toISOString(),
    }
  },
}
