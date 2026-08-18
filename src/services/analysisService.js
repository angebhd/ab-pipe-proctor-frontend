/**
 * Change detection against `/api/v1/change-detection`.
 *
 * The model compares two SAR chips of the same place — a reference capture and
 * a current one — and answers with where they differ most: an anomaly score,
 * the segment's coordinates, and the 16×16 patch that changed. It reads the
 * pair as GeoTIFFs with two bands (VV and VH), so nothing else is accepted.
 */

import { apiClient } from './apiClient'
import { SEGMENT_COUNT, segmentIdFor, segmentNumberFrom } from '../lib/corridor'

export const MAX_FILE_BYTES = 15 * 1024 * 1024

/** The content types the endpoint accepts for either half of the pair. */
export const ACCEPTED_TYPES = ['image/tiff', 'image/tif', 'application/octet-stream']

export const ACCEPT_ATTRIBUTE = '.tif,.tiff,image/tiff'

/** The model reports on a 16×16 grid of patches over each chip. */
export const PATCH_GRID = 16

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const hasTiffExtension = (name) => /\.tiff?$/i.test(name)

/**
 * Rejects what the endpoint will not read, before a request is ever made — the
 * file picker's `accept` is a hint, and a drop bypasses it entirely.
 */
export function rejectionFor(file) {
  if (!ACCEPTED_TYPES.includes(file.type) && !hasTiffExtension(file.name)) {
    return 'The model reads GeoTIFF SAR chips. Use a .tif or .tiff file.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return `That file is ${formatFileSize(file.size)}. The model takes up to ${formatFileSize(MAX_FILE_BYTES)}.`
  }
  return ''
}

/**
 * Some browsers hand back an empty or generic type for `.tif`, which the
 * endpoint rejects outright. Re-wrapping the bytes with the right type keeps a
 * valid file from being turned away on a guess the browser made.
 */
function asTiff(file) {
  if (file.type === 'image/tiff') return file
  return new File([file], file.name, { type: 'image/tiff' })
}

export const analysisService = {
  /**
   * @param {{ referenceFile: File, currentFile: File, segment: number }} submission
   *   `segment` is the 1-based corridor segment both chips cover; it is sent
   *   as a `segment_id` in the model's `P1328_SEG_0011` form.
   */
  detectChange: async ({ referenceFile, currentFile, segment }) => {
    if (!referenceFile) throw new Error('Choose the reference capture.')
    if (!currentFile) throw new Error('Choose the current capture.')

    for (const file of [referenceFile, currentFile]) {
      const rejection = rejectionFor(file)
      if (rejection) throw new Error(rejection)
    }

    if (!(segment >= 1 && segment <= SEGMENT_COUNT)) {
      throw new Error(`Pick a segment between 1 and ${SEGMENT_COUNT}.`)
    }

    const form = new FormData()
    form.append('reference_image', asTiff(referenceFile), referenceFile.name)
    form.append('current_image', asTiff(currentFile), currentFile.name)
    form.append('segment_id', segmentIdFor(segment))

    const result = await apiClient.postForm('/api/v1/change-detection', form)

    return {
      segmentId: result.segment_id,
      segment: segmentNumberFrom(result.segment_id),
      anomalyScore: result.anomaly_score,
      coords: { lat: result.latitude, lon: result.longitude },
      patch: {
        index: result.patch_index,
        row: result.patch_row,
        col: result.patch_col,
      },
      referenceName: referenceFile.name,
      currentName: currentFile.name,
      analyzedAt: new Date().toISOString(),
    }
  },
}
