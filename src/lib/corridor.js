/**
 * Geometry of the Niger–Benin export pipeline.
 *
 * The corridor runs from the Agadem oilfields to the Sèmè terminal and is
 * split into twenty equal segments, each about a hundred kilometres. The model
 * addresses a segment by the chip id it was cut as (`P1328_SEG_0011`); the
 * chip set currently covers a twenty kilometre pilot strip, and each chip is
 * treated here as standing for its whole segment.
 *
 * Detections come back from the API as bare latitude/longitude, so placing one
 * on a segment happens here and nowhere else.
 */

/** Total corridor length, Agadem oilfields → Sèmè terminal, in kilometres. */
export const CORRIDOR_LENGTH_KM = 1950

/**
 * The corridor is not addressed by place names. The model reports per segment
 * and operators dispatch per segment, so a segment number is the only position
 * the whole system agrees on. Cities below are reference points only.
 */
export const SEGMENT_COUNT = 20

export const SEGMENT_LENGTH_KM = CORRIDOR_LENGTH_KM / SEGMENT_COUNT

/** The Gaya crossing splits the corridor between the two countries. */
export const BORDER_KM = 1200

/** Product the chips were cut from; the first half of every `segment_id`. */
export const CHIP_PRODUCT_ID = 'P1328'

/** Head (Agadem, Niger) and tail (Sèmè terminal, Benin) of the corridor. */
const HEAD = { lat: 13.6, lon: 13.1 }
const TAIL = { lat: 6.36, lon: 2.65 }

/**
 * How far off the line a point may sit and still count as on the corridor.
 * Generous, because the corridor is modelled as a straight line while the
 * pipeline itself bends.
 */
export const MAX_OFFSET_KM = 150

const KM_PER_DEGREE = 111.32

/**
 * Towns along the route, by chainage from Agadem. These label the schematic
 * so a segment number can be read against somewhere recognisable; nothing is
 * positioned or filtered by them.
 */
export const CITIES = [
  { name: 'Agadem', km: 0, country: 'Niger' },
  { name: 'Zinder', km: 500, country: 'Niger' },
  { name: 'Dosso', km: 1100, country: 'Niger' },
  { name: 'Gaya', km: BORDER_KM, country: 'Niger', isBorder: true },
  { name: 'Parakou', km: 1500, country: 'Benin' },
  { name: 'Sèmè', km: CORRIDOR_LENGTH_KM, country: 'Benin', isTerminal: true },
]

export const SEGMENTS = Array.from({ length: SEGMENT_COUNT }, (_, index) => {
  const startKm = index * SEGMENT_LENGTH_KM

  return {
    id: index + 1,
    segmentId: `${CHIP_PRODUCT_ID}_SEG_${String(index + 1).padStart(4, '0')}`,
    startKm,
    endKm: startKm + SEGMENT_LENGTH_KM,
    // A segment belongs to whichever country holds its midpoint; only the one
    // straddling the crossing is ambiguous, and it leans to the longer half.
    country: startKm + SEGMENT_LENGTH_KM / 2 < BORDER_KM ? 'Niger' : 'Benin',
  }
})

/** `11` → the segment record. Ids are 1-based, the array is not. */
export const getSegment = (id) => SEGMENTS[id - 1]

/** `1062` → `11`, for anything still reported by chainage. */
export const segmentForKm = (km) =>
  Math.min(SEGMENT_COUNT, Math.max(1, Math.floor(km / SEGMENT_LENGTH_KM) + 1))

/** `P1328_SEG_0011` for segment 11 — how the model addresses a chip. */
export const segmentIdFor = (segment) =>
  `${CHIP_PRODUCT_ID}_SEG_${String(segment).padStart(4, '0')}`

/** `P1328_SEG_0011` → `11`, for a response the model echoes back. */
export function segmentNumberFrom(segmentId) {
  const digits = /_SEG_(\d+)$/.exec(segmentId ?? '')
  return digits ? Number(digits[1]) : null
}

/**
 * Equirectangular projection to kilometres, accurate enough over a corridor
 * this size and far cheaper than the spherical alternative.
 */
function toPlane({ lat, lon }, referenceLat) {
  return {
    x: lon * KM_PER_DEGREE * Math.cos((referenceLat * Math.PI) / 180),
    y: lat * KM_PER_DEGREE,
  }
}

/** The corridor line, in the projected plane, computed once. */
const REFERENCE_LAT = (HEAD.lat + TAIL.lat) / 2
const HEAD_XY = toPlane(HEAD, REFERENCE_LAT)
const TAIL_XY = toPlane(TAIL, REFERENCE_LAT)
const AXIS_X = TAIL_XY.x - HEAD_XY.x
const AXIS_Y = TAIL_XY.y - HEAD_XY.y
const AXIS_LENGTH_SQ = AXIS_X * AXIS_X + AXIS_Y * AXIS_Y

/**
 * Coordinates at a given chainage — the inverse of `locateOnCorridor`, for
 * placing something that is only known by kilometre.
 */
export function coordsAtKm(km) {
  const along = Math.min(1, Math.max(0, km / CORRIDOR_LENGTH_KM))
  return {
    lat: HEAD.lat + along * (TAIL.lat - HEAD.lat),
    lon: HEAD.lon + along * (TAIL.lon - HEAD.lon),
  }
}

/**
 * Projects a detection's coordinates onto the corridor.
 *
 * Returns the 1-based segment and how far off the line the point sits, or a
 * `null` segment when it is further off than `MAX_OFFSET_KM` — the API accepts
 * any coordinate on earth, so points nowhere near the pipeline have to stay
 * representable rather than be forced onto a segment.
 *
 * @returns {{ segment: number | null, offsetKm: number, positionKm: number | null }}
 */
export function locateOnCorridor(coords) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) {
    return { segment: null, offsetKm: Infinity, positionKm: null }
  }

  const point = toPlane(coords, REFERENCE_LAT)

  // Fraction along the corridor, clamped so points beyond either end land on
  // the terminal segment rather than off the scale.
  const raw =
    ((point.x - HEAD_XY.x) * AXIS_X + (point.y - HEAD_XY.y) * AXIS_Y) / AXIS_LENGTH_SQ
  const along = Math.min(1, Math.max(0, raw))

  const nearestX = HEAD_XY.x + along * AXIS_X
  const nearestY = HEAD_XY.y + along * AXIS_Y
  const perpendicularKm = Math.hypot(point.x - nearestX, point.y - nearestY)

  // Points past the ends are off-corridor by their overshoot too, not just
  // their perpendicular distance.
  const overshootKm = Math.abs(raw - along) * Math.sqrt(AXIS_LENGTH_SQ)
  const offsetKm = Math.hypot(perpendicularKm, overshootKm)

  if (offsetKm > MAX_OFFSET_KM) {
    return { segment: null, offsetKm, positionKm: null }
  }

  return {
    segment: Math.min(SEGMENT_COUNT, Math.floor(along * SEGMENT_COUNT) + 1),
    offsetKm,
    positionKm: along * CORRIDOR_LENGTH_KM,
  }
}
