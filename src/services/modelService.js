/**
 * Mock model card and evaluation results for the detection model, standing in
 * until training runs are logged somewhere the frontend can read.
 *
 * TODO: swap for `apiClient.get('/model/current')` once the pipeline reports
 * its runs. Numbers here are placeholders, not measured results.
 */

const MOCK_DELAY_MS = 400

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const MODEL_CARD = {
  name: 'Chroma-EO-2.0',
  source: 'NASA / IBM geospatial foundation model',
  sourceUrl: 'https://huggingface.co/ibm-nasa-geospatial',
  version: 'pp-ft-0.3',
  task: 'Change segmentation on the pipeline corridor',
  status: 'Prototype',
  trainedOn: '2026-08-12T00:00:00Z',
  spec: [
    { label: 'Input', value: 'Sentinel-1 GRD, VV + VH' },
    { label: 'Resolution', value: '10 m per pixel' },
    { label: 'Tile size', value: '512 × 512 px' },
    { label: 'Revisit', value: 'Every 6 to 12 days' },
    { label: 'Fine-tuning', value: '12 epochs, AdamW' },
    { label: 'Hardware', value: 'Google Colab T4' },
  ],
}

const HEADLINE = {
  precision: 0.88,
  recall: 0.83,
  f1: 0.85,
  iou: 0.71,
}

const DATASET = {
  tilePairs: 961,
  splits: [
    { label: 'Train', tiles: 673 },
    { label: 'Validation', tiles: 144 },
    { label: 'Test', tiles: 144 },
  ],
}

/** Validation F1 against training F1, per epoch. */
const CURVE = [
  { epoch: 1, train: 0.42, validation: 0.38 },
  { epoch: 2, train: 0.55, validation: 0.49 },
  { epoch: 3, train: 0.63, validation: 0.58 },
  { epoch: 4, train: 0.7, validation: 0.64 },
  { epoch: 5, train: 0.75, validation: 0.69 },
  { epoch: 6, train: 0.79, validation: 0.73 },
  { epoch: 7, train: 0.82, validation: 0.77 },
  { epoch: 8, train: 0.85, validation: 0.8 },
  { epoch: 9, train: 0.87, validation: 0.82 },
  { epoch: 10, train: 0.89, validation: 0.84 },
  { epoch: 11, train: 0.9, validation: 0.85 },
  { epoch: 12, train: 0.91, validation: 0.85 },
]

/** Per anomaly class, scored on the held-out test split. */
const CLASSES = [
  { label: 'Ground disturbance', precision: 0.86, recall: 0.84, support: 388 },
  { label: 'Excavation', precision: 0.91, recall: 0.87, support: 214 },
  { label: 'Vehicle cluster', precision: 0.83, recall: 0.79, support: 156 },
  { label: 'New access track', precision: 0.88, recall: 0.81, support: 132 },
  { label: 'Encroachment', precision: 0.74, recall: 0.66, support: 71 },
]

export const modelService = {
  getModel: async () => {
    await wait(MOCK_DELAY_MS)
    return {
      card: MODEL_CARD,
      headline: HEADLINE,
      dataset: DATASET,
      curve: CURVE,
      classes: CLASSES,
    }
  },
}
