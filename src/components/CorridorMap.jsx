import {
  BORDER_KM,
  CORRIDOR_LENGTH_KM,
  SEGMENTS,
  SEGMENT_COUNT,
} from '../services/monitoringService'
import {
  SEVERITY,
  SEVERITY_KEYS,
  formatSegment,
  worstSeverity,
} from '../lib/detections'

// Schematic geometry: the corridor is drawn straightened and split into its
// twenty equal segments, so a block's position is its segment, not ground
// position.
const WIDTH = 1000
const HEIGHT = 128
const PADDING = 28
const BAR_Y = 44
const BAR_HEIGHT = 30
const GAP = 3

const INNER_WIDTH = WIDTH - PADDING * 2
const SLOT = INNER_WIDTH / SEGMENT_COUNT

const toX = (km) => PADDING + (km / CORRIDOR_LENGTH_KM) * INNER_WIDTH

/** brand-100 — cleared: something was found here, and it was dealt with. */
const CLEARED_FILL = '#d3f8dd'
/** slate-200 — the segment is quiet on this pass. */
const QUIET_FILL = '#e2e8f0'

const groupBySegment = (detections) => {
  const bySegment = new Map()

  for (const detection of detections) {
    const bucket = bySegment.get(detection.segment)
    if (bucket) bucket.push(detection)
    else bySegment.set(detection.segment, [detection])
  }

  return bySegment
}

/**
 * What the block is coloured by: the worst severity still open in the
 * segment. Cleared detections no longer raise the segment, they only stop it
 * reading as untouched.
 */
function fillFor(open, cleared) {
  const severity = worstSeverity(open)
  if (severity) return `var(--color-severity-${severity})`
  return cleared.length > 0 ? CLEARED_FILL : QUIET_FILL
}

/** Clicking a segment opens whatever most needs attention inside it. */
function leadDetection(open, cleared) {
  const ranked = [...open].sort(
    (a, b) =>
      SEVERITY_KEYS.indexOf(a.severity) - SEVERITY_KEYS.indexOf(b.severity) ||
      new Date(b.detectedAt) - new Date(a.detectedAt),
  )

  return ranked[0] ?? cleared[0] ?? null
}

function Schematic({ detections, selectedId, onSelect }) {
  const bySegment = groupBySegment(detections)
  const flagged = SEGMENTS.filter(({ id }) =>
    (bySegment.get(id) ?? []).some((detection) => detection.status !== 'cleared'),
  ).length

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full min-w-176"
      role="img"
      aria-label={`Schematic of the corridor in ${SEGMENT_COUNT} segments, ${flagged} of them with open detections`}
    >
      <text
        x={toX(BORDER_KM / 2)}
        y="16"
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="11"
        letterSpacing="0.06em"
      >
        NIGER
      </text>
      <text
        x={toX((BORDER_KM + CORRIDOR_LENGTH_KM) / 2)}
        y="16"
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="11"
        letterSpacing="0.06em"
      >
        BENIN
      </text>

      {SEGMENTS.map(({ id }) => {
        const inSegment = bySegment.get(id) ?? []
        const open = inSegment.filter(
          (detection) => detection.status !== 'cleared',
        )
        const cleared = inSegment.filter(
          (detection) => detection.status === 'cleared',
        )
        const lead = leadDetection(open, cleared)
        const isSelected =
          selectedId != null &&
          inSegment.some((detection) => detection.id === selectedId)

        const x = PADDING + (id - 1) * SLOT
        const width = SLOT - GAP
        const isColoured = open.length > 0

        return (
          <g
            key={id}
            onClick={lead && onSelect ? () => onSelect(lead) : undefined}
            className={lead && onSelect ? 'cursor-pointer' : undefined}
          >
            <title>
              {`${formatSegment(id)} — ${
                inSegment.length === 0
                  ? 'no detections'
                  : `${inSegment.length} detection${inSegment.length > 1 ? 's' : ''}, ${open.length} open`
              }`}
            </title>

            <rect
              x={x}
              y={BAR_Y}
              width={width}
              height={BAR_HEIGHT}
              rx="4"
              fill={fillFor(open, cleared)}
            />

            {inSegment.length > 0 && (
              <text
                x={x + width / 2}
                y={BAR_Y + BAR_HEIGHT / 2 + 4}
                textAnchor="middle"
                fill={isColoured ? '#ffffff' : '#0b5b1c'}
                fontSize="11"
                fontWeight="600"
              >
                {inSegment.length}
              </text>
            )}

            {isSelected && (
              <rect
                x={x - 2.5}
                y={BAR_Y - 2.5}
                width={width + 5}
                height={BAR_HEIGHT + 5}
                rx="6"
                fill="none"
                stroke="#0f172a"
                strokeWidth="2"
              />
            )}

            <text
              x={x + width / 2}
              y={BAR_Y + BAR_HEIGHT + 20}
              textAnchor="middle"
              fill={isSelected ? '#0f172a' : '#64748b'}
              fontSize="11"
              fontWeight={isSelected ? '600' : '400'}
            >
              {id}
            </text>
          </g>
        )
      })}

      {/* The Gaya crossing falls inside a segment rather than between two. */}
      <line
        x1={toX(BORDER_KM)}
        y1={BAR_Y - 12}
        x2={toX(BORDER_KM)}
        y2={BAR_Y + BAR_HEIGHT + 6}
        stroke="#64748b"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />

      <text
        x={WIDTH - PADDING}
        y={HEIGHT - 6}
        textAnchor="end"
        fill="#94a3b8"
        fontSize="11"
      >
        {`${CORRIDOR_LENGTH_KM.toLocaleString('en-US')} km in ${SEGMENT_COUNT} segments`}
      </text>
    </svg>
  )
}

function LegendSwatch({ className, style, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`size-2.5 rounded-sm ${className}`}
        style={style}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}

/** The corridor, straightened, as twenty segments coloured by what is open. */
function CorridorMap({ detections, selectedId, onSelect }) {
  return (
    <div>
      {/* Under the schematic's min-width the labels would shrink past
          legibility, so it scrolls rather than squashing. */}
      <div className="overflow-x-auto">
        <Schematic
          detections={detections}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
        {SEVERITY_KEYS.map((key) => (
          <LegendSwatch
            key={key}
            className={SEVERITY[key].bar}
            label={SEVERITY[key].label}
          />
        ))}
        <LegendSwatch
          style={{ backgroundColor: CLEARED_FILL }}
          label="Cleared"
        />
        <LegendSwatch style={{ backgroundColor: QUIET_FILL }} label="Quiet" />
        <span className="ml-auto text-slate-400">
          A block is one segment, coloured by the worst detection still open in
          it
        </span>
      </div>
    </div>
  )
}

export default CorridorMap
