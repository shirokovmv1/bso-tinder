import { useState } from 'react'

export interface DonutSegment {
  id: string      // department key/slug
  label: string   // display name
  count: number   // match count (0 = muted)
  color: string   // CSS color value
}

interface DepartmentDonutProps {
  segments: DonutSegment[]
  onSegmentClick?: (seg: DonutSegment) => void
  loading?: boolean
  elapsedSeconds?: number
}

// Preset colours — extended with fallback generator
export const DEPT_COLORS: Record<string, string> = {
  'Логистика':       '#FF6B00',
  'Стройка':         '#5b6cff',
  'IT':              '#34D399',
  'IT-отдел':        '#34D399',
  'Финансы':         '#B388FF',
  'HR':              '#FF8FAB',
  'Склад':           '#F2C879',
  'Таможня':         '#6ED7B7',
  'Закупки':         '#F59E7A',
  'Документооборот': '#C4A7FF',
  'Бухгалтерия':     '#FCA5A5',
  'Маркетинг':       '#8EA4FF',
}

function colorForDept(name: string): string {
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return `hsl(${hue}, 70%, 58%)`
}

export function getDeptColor(name: string): string {
  return DEPT_COLORS[name] ?? colorForDept(name)
}

// Fixed viewBox - component scales via CSS width/aspect-ratio
const VB = 320
const CX = 160, CY = 160
const OUTER_R = 148, INNER_R = 70
const MID_R = (OUTER_R + INNER_R) / 2
const GAP_DEG = 3
const LABEL_LINE_LIMIT = 13

function polar(r: number, deg: number): [number, number] {
  const rad = (deg - 90) * (Math.PI / 180)
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function buildArcPath(startDeg: number, endDeg: number): string {
  const [ox1, oy1] = polar(OUTER_R, startDeg)
  const [ox2, oy2] = polar(OUTER_R, endDeg)
  const [ix2, iy2] = polar(INNER_R, endDeg)
  const [ix1, iy1] = polar(INNER_R, startDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  const f = (n: number) => n.toFixed(2)
  return [
    `M${f(ox1)} ${f(oy1)}`,
    `A${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${f(ox2)} ${f(oy2)}`,
    `L${f(ix2)} ${f(iy2)}`,
    `A${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${f(ix1)} ${f(iy1)}Z`,
  ].join(' ')
}

function trimLabel(value: string, limit = LABEL_LINE_LIMIT): string {
  if (value.length <= limit) return value
  return `${value.slice(0, Math.max(1, limit - 3))}...`
}

function splitLabel(label: string): string[] {
  const cleanLabel = label.trim()
  if (cleanLabel.length <= LABEL_LINE_LIMIT) return [cleanLabel]

  const words = cleanLabel.split(/\s+/).filter(Boolean)
  if (words.length <= 1) return [trimLabel(cleanLabel)]

  const firstWords: string[] = []
  const secondWords: string[] = []

  for (const word of words) {
    const target = firstWords.join(' ')
    const nextFirst = target ? `${target} ${word}` : word
    if (!secondWords.length && nextFirst.length <= LABEL_LINE_LIMIT) {
      firstWords.push(word)
    } else {
      secondWords.push(word)
    }
  }

  const firstLine = firstWords.length ? firstWords.join(' ') : trimLabel(words[0])
  const secondLine = trimLabel(secondWords.join(' '))

  return secondLine ? [firstLine, secondLine] : [firstLine]
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function DepartmentDonut({
  segments,
  onSegmentClick,
  loading = false,
  elapsedSeconds,
}: DepartmentDonutProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (segments.length === 0) return null

  const n = segments.length
  const sectorDeg = (360 - n * GAP_DEG) / n
  const loadingR = OUTER_R + 6
  const loadingCirc = 2 * Math.PI * loadingR

  const built = segments.map((seg, i) => {
    const startDeg = i * (sectorDeg + GAP_DEG)
    const endDeg = startDeg + sectorDeg
    const midDeg = startDeg + sectorDeg / 2
    const [lx, ly] = polar(MID_R + 4, midDeg)
    const [nx, ny] = polar(MID_R + 35, midDeg)
    const labelRotation = midDeg > 90 && midDeg < 270 ? midDeg + 90 : midDeg - 90
    const labelLines = splitLabel(seg.label)
    // Hex alpha 35% для неактивных сегментов
    const dimColor = seg.color.startsWith('#') ? `${seg.color}59` : seg.color
    return { ...seg, path: buildArcPath(startDeg, endDeg), lx, ly, nx, ny, labelRotation, labelLines, dimColor }
  })

  return (
    <div className="donut-wrapper">
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
        role="img"
        aria-label="Распределение матчей по отделам"
      >
        <defs>
          {built.map(seg => (
            <linearGradient key={`grad-${seg.id}`} id={`grad-${seg.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seg.color} stopOpacity="1" />
              <stop offset="100%" stopColor={seg.color} stopOpacity="0.72" />
            </linearGradient>
          ))}
        </defs>

        {/* Sectors */}
        {built.map(seg => {
          const active = seg.count > 0
          const hovered = hoveredId === seg.id && active
          return (
            <g
              key={seg.id}
              className={active ? 'donut-sector' : 'donut-sector donut-sector--muted'}
              role={active ? 'button' : undefined}
              aria-label={active ? `${seg.label}: ${seg.count} матчей` : seg.label}
              tabIndex={active ? 0 : undefined}
              onClick={() => onSegmentClick?.(seg)}
              onKeyDown={e => e.key === 'Enter' && onSegmentClick?.(seg)}
              onMouseEnter={() => active && setHoveredId(seg.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <path
                d={seg.path}
                fill={active ? `url(#grad-${seg.id})` : seg.dimColor}
                stroke="rgba(0,0,0,0.22)"
                strokeWidth="1.5"
                style={{
                  transition: 'opacity .15s, filter .15s',
                  filter: hovered ? `drop-shadow(0 0 8px ${seg.color})` : 'none',
                  opacity: hovered ? 0.88 : 1,
                }}
              />

              <text
                x={seg.lx} y={seg.ly}
                textAnchor="middle" dominantBaseline="middle"
                fill={active ? 'rgba(255,255,255,0.93)' : 'rgba(255,255,255,0.35)'}
                fontSize={seg.labelLines.length > 1 ? '8.4' : '9.2'}
                fontWeight="850"
                fontFamily="Manrope, system-ui, sans-serif"
                transform={`rotate(${seg.labelRotation} ${seg.lx} ${seg.ly})`}
                style={{ pointerEvents: 'none', userSelect: 'none', letterSpacing: 0 }}
              >
                {seg.labelLines.map((line, lineIndex) => (
                  <tspan
                    key={`${seg.id}-${line}`}
                    x={seg.lx}
                    dy={lineIndex === 0 ? (seg.labelLines.length > 1 ? '-0.45em' : '0') : '1.05em'}
                  >
                    {line}
                  </tspan>
                ))}
              </text>

              {/* Match count — shown only when > 0 */}
              {active && (
                <text
                  x={seg.nx} y={seg.ny}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#fff"
                  fontSize="17" fontWeight="800"
                  fontFamily="Manrope, system-ui, sans-serif"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {seg.count}
                </text>
              )}
            </g>
          )
        })}

        {/* Clock in center */}
        <text
          x={CX} y={CY}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.85)"
          fontSize="28" fontWeight="800"
          fontFamily="Manrope, system-ui, sans-serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {formatElapsed(elapsedSeconds ?? 0)}
        </text>

        {/* Loading arc */}
        {loading && (
          <circle
            cx={CX} cy={CY}
            r={loadingR}
            fill="none"
            stroke="var(--brand-orange)"
            strokeWidth="5"
            strokeDasharray={`${(loadingCirc * 0.13).toFixed(1)} ${(loadingCirc * 0.87).toFixed(1)}`}
            strokeLinecap="round"
            className="donut-loading-arc"
          />
        )}
      </svg>
    </div>
  )
}
