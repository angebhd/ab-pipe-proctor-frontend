/**
 * Mock monitoring data, standing in for the detection API until the SAR
 * pipeline is wired up. The shapes here are what the backend is expected to
 * return, so pages should not need changes once the endpoints exist.
 *
 * TODO: swap each getter for `apiClient.get(...)` when the backend is ready.
 */

const MOCK_DELAY_MS = 400

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Total corridor length, Agadem oilfields → Sèmè terminal, in kilometres. */
export const CORRIDOR_LENGTH_KM = 1950

/**
 * The corridor is split into equal numbered segments rather than named
 * places: the model reports per segment, and operators dispatch per segment,
 * so a segment number is the only position the whole system agrees on.
 */
export const SEGMENT_COUNT = 20

export const SEGMENT_LENGTH_KM = CORRIDOR_LENGTH_KM / SEGMENT_COUNT

/** The border crossing splits the corridor between the two countries. */
export const BORDER_KM = 1200

export const SEGMENTS = Array.from({ length: SEGMENT_COUNT }, (_, index) => {
  const startKm = index * SEGMENT_LENGTH_KM

  return {
    id: index + 1,
    startKm,
    endKm: startKm + SEGMENT_LENGTH_KM,
    // A segment belongs to whichever country holds its midpoint; only the one
    // straddling the crossing is ambiguous, and it leans to the longer half.
    country: startKm + SEGMENT_LENGTH_KM / 2 < BORDER_KM ? 'Niger' : 'Benin',
  }
})

/** `11` → the segment record. Ids are 1-based, the array is not. */
export const getSegment = (id) => SEGMENTS[id - 1]

/** `1062` → `11`, for placing anything still reported by kilometre. */
export const segmentForKm = (km) =>
  Math.min(SEGMENT_COUNT, Math.floor(km / SEGMENT_LENGTH_KM) + 1)

const DETECTIONS = [
  {
    id: 'PP-2418',
    segment: 11,
    type: 'Excavation',
    severity: 'high',
    status: 'open',
    confidence: 0.94,
    detectedAt: '2026-08-11T06:12:00Z',
    pass: 'S1A-20260811',
    coords: { lat: 13.048, lon: 3.192 },
    note: 'Fresh spoil heaps within 40 m of the buried line, no permit on file.',
  },
  {
    id: 'PP-2417',
    segment: 13,
    type: 'Vehicle cluster',
    severity: 'high',
    status: 'reviewing',
    confidence: 0.88,
    detectedAt: '2026-08-11T06:12:00Z',
    pass: 'S1A-20260811',
    coords: { lat: 11.889, lon: 3.441 },
    note: 'Six returns parked off-track overnight, repeated on two passes.',
  },
  {
    id: 'PP-2415',
    segment: 8,
    type: 'Ground disturbance',
    severity: 'high',
    status: 'open',
    confidence: 0.81,
    detectedAt: '2026-08-09T05:58:00Z',
    pass: 'S1A-20260809',
    coords: { lat: 13.712, lon: 9.408 },
    note: 'Backscatter drop consistent with recent trenching across the corridor.',
  },
  {
    id: 'PP-2412',
    segment: 17,
    type: 'New access track',
    severity: 'medium',
    status: 'reviewing',
    confidence: 0.77,
    detectedAt: '2026-08-09T05:58:00Z',
    pass: 'S1A-20260809',
    coords: { lat: 9.612, lon: 2.588 },
    note: 'Unregistered track reaching the easement from the east.',
  },
  {
    id: 'PP-2409',
    segment: 4,
    type: 'Ground disturbance',
    severity: 'medium',
    status: 'open',
    confidence: 0.72,
    detectedAt: '2026-08-07T06:04:00Z',
    pass: 'S1A-20260807',
    coords: { lat: 14.201, lon: 12.884 },
    note: 'Surface change over roughly 0.4 ha, no matching maintenance ticket.',
  },
  {
    id: 'PP-2404',
    segment: 14,
    type: 'Vehicle cluster',
    severity: 'medium',
    status: 'cleared',
    confidence: 0.69,
    detectedAt: '2026-08-05T06:01:00Z',
    pass: 'S1A-20260805',
    coords: { lat: 11.128, lon: 2.938 },
    note: 'Field team confirmed a seasonal herding camp. No action needed.',
  },
  {
    id: 'PP-2398',
    segment: 10,
    type: 'Excavation',
    severity: 'medium',
    status: 'cleared',
    confidence: 0.83,
    detectedAt: '2026-08-03T05:55:00Z',
    pass: 'S1A-20260803',
    coords: { lat: 13.795, lon: 5.256 },
    note: 'Matched a scheduled valve-station dig. Closed after inspection.',
  },
  {
    id: 'PP-2395',
    segment: 20,
    type: 'Encroachment',
    severity: 'low',
    status: 'open',
    confidence: 0.58,
    detectedAt: '2026-08-03T05:55:00Z',
    pass: 'S1A-20260803',
    coords: { lat: 6.461, lon: 2.622 },
    note: 'Structure raised inside the easement buffer, low confidence.',
  },
  {
    id: 'PP-2390',
    segment: 6,
    type: 'Ground disturbance',
    severity: 'low',
    status: 'cleared',
    confidence: 0.54,
    detectedAt: '2026-08-01T06:07:00Z',
    pass: 'S1A-20260801',
    coords: { lat: 15.02, lon: 11.114 },
    note: 'Attributed to wind-driven dune movement after review.',
  },
  {
    id: 'PP-2386',
    segment: 15,
    type: 'New access track',
    severity: 'low',
    status: 'cleared',
    confidence: 0.61,
    detectedAt: '2026-07-30T06:03:00Z',
    pass: 'S1A-20260730',
    coords: { lat: 10.228, lon: 2.669 },
    note: 'Farm track, unchanged across three consecutive passes.',
  },
]

/** Twelve weeks of detection counts, oldest first. */
const WEEKLY_TREND = [
  { week: '25 May', detections: 4 },
  { week: '1 Jun', detections: 6 },
  { week: '8 Jun', detections: 5 },
  { week: '15 Jun', detections: 9 },
  { week: '22 Jun', detections: 7 },
  { week: '29 Jun', detections: 11 },
  { week: '6 Jul', detections: 8 },
  { week: '13 Jul', detections: 12 },
  { week: '20 Jul', detections: 10 },
  { week: '27 Jul', detections: 14 },
  { week: '3 Aug', detections: 11 },
  { week: '10 Aug', detections: 16 },
]

const LAST_PASS = {
  id: 'S1A-20260811',
  capturedAt: '2026-08-11T06:12:00Z',
  coveredSegments: SEGMENT_COUNT,
  nextPassAt: '2026-08-17T06:10:00Z',
}

export const monitoringService = {
  /** Everything the dashboard needs in one call. */
  getOverview: async () => {
    await wait(MOCK_DELAY_MS)
    return {
      detections: DETECTIONS,
      trend: WEEKLY_TREND,
      lastPass: LAST_PASS,
    }
  },

  /** The full detection list for the monitoring view. */
  getDetections: async () => {
    await wait(MOCK_DELAY_MS)
    return DETECTIONS
  },
}
