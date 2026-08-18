/**
 * What the detection model is, and what it has actually produced.
 *
 * The card below describes the pipeline the backend runs — the CROMA SAR
 * encoder, its input contract, and how a change becomes a score. There is no
 * training-metrics endpoint, so rather than quote precision and recall from
 * nowhere, the page reports the distribution of the detections the model has
 * recorded, read from `/api/v1/detections`.
 */

import { monitoringService } from './monitoringService'
import { PATCH_GRID } from './analysisService'
import {
  ANOMALY_TYPE_KEYS,
  SEVERITY_KEYS,
  STATUS_KEYS,
  anomalyTypeLabel,
  SEVERITY,
  STATUS,
} from '../lib/detections'

/** Fixed by the encoder the backend loads, not by anything configurable here. */
const MODEL_CARD = {
  name: 'CROMA',
  size: 'base',
  source: 'Contrastive Radar-Optical Masked Autoencoder',
  sourceUrl: 'https://github.com/antofuller/CROMA',
  task: 'Change detection between two SAR captures of one corridor segment',
  spec: [
    { label: 'Modality', value: 'SAR' },
    { label: 'Input', value: 'GeoTIFF, 2 bands (VV + VH)' },
    { label: 'Chip size', value: '128 × 128 px' },
    { label: 'Patch grid', value: `${PATCH_GRID} × ${PATCH_GRID} (${PATCH_GRID ** 2} patches)` },
    { label: 'Normalisation', value: 'Per band, mean ± 2σ, clamped to 0–1' },
    { label: 'Change measure', value: '1 − cosine similarity of patch embeddings' },
    { label: 'Anomaly score', value: 'max patch change + 2 × σ' },
  ],
}

const share = (count, total) => (total > 0 ? count / total : 0)

/** Counts a detection list by one of its keys, keeping a fixed key order. */
function distribute(detections, keys, pick, labelFor, styleFor) {
  return keys.map((key) => {
    const count = detections.filter((detection) => pick(detection) === key).length

    return {
      key,
      label: labelFor(key),
      count,
      share: share(count, detections.length),
      ...styleFor(key),
    }
  })
}

export const modelService = {
  getModel: async () => {
    const detections = await monitoringService.getDetections()

    const confidences = detections.map((detection) => detection.confidence)
    const onCorridor = detections.filter((detection) => detection.segment != null)
    const segmentsCovered = new Set(onCorridor.map((detection) => detection.segment)).size

    return {
      card: MODEL_CARD,
      output: {
        total: detections.length,
        meanConfidence: confidences.length
          ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
          : 0,
        minConfidence: confidences.length ? Math.min(...confidences) : 0,
        maxConfidence: confidences.length ? Math.max(...confidences) : 0,
        onCorridor: onCorridor.length,
        offCorridor: detections.length - onCorridor.length,
        segmentsCovered,
      },
      byType: distribute(
        detections,
        ANOMALY_TYPE_KEYS,
        (detection) => detection.type,
        anomalyTypeLabel,
        () => ({}),
      ),
      bySeverity: distribute(
        detections,
        SEVERITY_KEYS,
        (detection) => detection.severity,
        (key) => SEVERITY[key].label,
        (key) => ({ bar: SEVERITY[key].bar }),
      ),
      byStatus: distribute(
        detections,
        STATUS_KEYS,
        (detection) => detection.status,
        (key) => STATUS[key].label,
        () => ({}),
      ),
    }
  },
}
