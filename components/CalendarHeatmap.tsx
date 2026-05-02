'use client'

import { useState, useMemo, useRef } from 'react'
import type { CanvasAssignment } from '@/lib/canvas'
import { getAssignmentType, getAssignmentScore } from '@/lib/canvas'

interface Props {
  assignments: CanvasAssignment[]
}

interface Week {
  start: Date
  end: Date
  label: string
  assignments: CanvasAssignment[]
  score: number
}

function mondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function fmt(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function safeHref(raw: string | undefined | null): string {
  if (!raw) return '#'
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : '#'
  } catch {
    return '#'
  }
}

function yTicks(maxVal: number): number[] {
  if (maxVal <= 1) return [0, 1]
  if (maxVal <= 5) return [0, maxVal]
  if (maxVal <= 10) return [0, 5, 10]
  if (maxVal <= 20) return [0, 10, 20]
  if (maxVal <= 30) return [0, 10, 20, 30]
  const step = Math.ceil(maxVal / 3 / 10) * 10
  const top = Math.ceil(maxVal / step) * step
  return [0, step, top]
}

const TOTAL_WEEKS = 16
const CHART_DAYS = 7

// SVG coordinate system
const VW = 1000
const VH = 500
const L = 52   // left padding (y-axis labels)
const R = 1000 // right edge
const T = 14   // top padding
const B = 458  // bottom edge (x-axis labels sit below)
const PW = R - L  // plot width  = 948
const PH = B - T  // plot height = 444
const SLOT = PW / CHART_DAYS   // ~135.4 per day
const BAR_W = SLOT * 0.52      // ~70.4

function selectWeek(prev: number | null, next: number | null): number | null {
  return prev === next ? null : next
}

export default function CalendarHeatmap({ assignments }: Props) {
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | null>(null)
  const [requestedWeeks, setRequestedWeeks] = useState<Set<number>>(new Set())
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [tooltip, setTooltip] = useState<{
    dayIdx: number
    x: number
    y: number
    containerWidth: number
  } | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  function chooseWeek(i: number) {
    setSelectedWeekIdx((prev) => {
      const next = selectWeek(prev, i)
      if (next !== prev) setRescheduleLoading(false)
      return next
    })
  }

  const weeks = useMemo((): Week[] => {
    const today = new Date()
    const start = mondayOf(today)
    const result: Week[] = []
    let cur = new Date(start)
    for (let i = 0; i < TOTAL_WEEKS; i++) {
      const weekEnd = addDays(cur, 6)
      weekEnd.setHours(23, 59, 59, 999)
      const weekAssignments = assignments.filter((a) => {
        const due = new Date(a.due_at!)
        return due >= cur && due <= weekEnd
      })
      const score = weekAssignments.reduce((sum, a) => sum + getAssignmentScore(a.name), 0)
      result.push({
        start: new Date(cur),
        end: weekEnd,
        label: `${fmt(new Date(cur))} – ${fmt(weekEnd)}`,
        assignments: weekAssignments,
        score,
      })
      cur = addDays(cur, 7)
    }
    return result
  }, [assignments])

  const dailyData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: CHART_DAYS }, (_, i) => {
      const dayStart = addDays(today, i)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)
      const dayAssignments = assignments.filter((a) => {
        const due = new Date(a.due_at!)
        return due >= dayStart && due <= dayEnd
      })
      const score = dayAssignments.reduce((sum, a) => sum + getAssignmentScore(a.name), 0)
      return { date: dayStart, score, dayAssignments }
    })
  }, [assignments])

  const maxDailyScore = useMemo(
    () => Math.max(...dailyData.map((d) => d.score), 1),
    [dailyData]
  )

  const displayed = useMemo(() => {
    const week = selectedWeekIdx !== null ? weeks[selectedWeekIdx] : null
    if (!week) return []
    return [...week.assignments].sort(
      (a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()
    )
  }, [weeks, selectedWeekIdx])

  async function handleReschedule() {
    if (selectedWeekIdx === null) return
    setRescheduleLoading(true)
    const week = weeks[selectedWeekIdx]
    await fetch('/api/reschedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week: week.label,
        score: week.score,
        assignments: week.assignments.map((a) => ({
          name: a.name,
          due_at: a.due_at,
          courseCode: a.courseCode,
        })),
      }),
    })
    setRescheduleLoading(false)
    setRequestedWeeks((prev) => new Set(prev).add(selectedWeekIdx))
  }

  const ticks = yTicks(maxDailyScore)

  return (
    <div className="flex flex-col gap-6">
      {/* 16-week heatmap grid */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {weeks.map((week, i) => {
          const isRed = week.score >= 30
          const isSelected = selectedWeekIdx === i
          return (
            <button
              key={i}
              onClick={() => chooseWeek(i)}
              className={`flex flex-col gap-1 border p-2 text-left transition-all ${
                isRed
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
              } ${isSelected ? 'ring-2 ring-gray-900 ring-offset-1' : ''}`}
            >
              <span className="text-[9px] leading-tight text-gray-400 break-words">
                {fmt(week.start)}–{fmt(week.end)}
              </span>
              <span className={`text-lg font-light leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
                {week.score}
              </span>
            </button>
          )
        })}
      </div>

      {/* 7-day bar chart */}
      <div ref={chartRef} className="relative w-full" style={{ aspectRatio: '2 / 1' }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
          {/* Y-axis gridlines + labels */}
          {ticks.map((tick) => {
            const y = B - (tick / maxDailyScore) * PH
            return (
              <g key={tick}>
                <line
                  x1={L} y1={y} x2={R} y2={y}
                  stroke={tick === 0 ? '#d1d5db' : '#f3f4f6'}
                  strokeWidth={tick === 0 ? 1 : 0.75}
                />
                <text
                  x={L - 8} y={y + 4}
                  textAnchor="end"
                  fontSize={20}
                  fill="#9ca3af"
                  fontFamily="inherit"
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {/* Y-axis line */}
          <line x1={L} y1={T} x2={L} y2={B} stroke="#e5e7eb" strokeWidth={0.75} />

          {/* Bars + x-axis labels + hover zones */}
          {dailyData.map(({ score, date }, i) => {
            const barH = score > 0 ? Math.max(3, (score / maxDailyScore) * PH) : 0
            const cx = L + (i + 0.5) * SLOT
            const bx = cx - BAR_W / 2
            const by = B - barH
            const label = i === 0
              ? 'Today'
              : date.toLocaleDateString('en-US', { weekday: 'short' })
            const isHovered = tooltip?.dayIdx === i
            return (
              <g
                key={i}
                onMouseMove={(e) => {
                  const rect = chartRef.current?.getBoundingClientRect()
                  if (!rect) return
                  setTooltip({
                    dayIdx: i,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    containerWidth: rect.width,
                  })
                }}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'default' }}
              >
                {/* transparent full-column hit area */}
                <rect x={L + i * SLOT} y={T} width={SLOT} height={PH + 10} fill="transparent" />
                {barH > 0 && (
                  <rect
                    x={bx} y={by} width={BAR_W} height={barH}
                    fill={isHovered ? '#374151' : '#111111'}
                  />
                )}
                <line x1={cx} y1={B} x2={cx} y2={B + 6} stroke="#d1d5db" strokeWidth={0.75} />
                <text
                  x={cx} y={B + 28}
                  textAnchor="middle"
                  fontSize={20}
                  fill={i === 0 ? '#6b7280' : '#9ca3af'}
                  fontFamily="inherit"
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Hover tooltip */}
        {tooltip !== null && (() => {
          const day = dailyData[tooltip.dayIdx]
          const TOOLTIP_W = 224
          const rawLeft = tooltip.dayIdx < 4
            ? tooltip.x + 14
            : tooltip.x - 14 - TOOLTIP_W
          const leftPos = Math.max(4, Math.min(rawLeft, tooltip.containerWidth - TOOLTIP_W - 4))
          const topPos = Math.max(4, tooltip.y - 16)
          return (
            <div
              className="absolute z-50 bg-white border border-gray-200 shadow-lg pointer-events-none"
              style={{ left: leftPos, top: topPos, width: TOOLTIP_W }}
            >
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-light text-gray-900">
                  {tooltip.dayIdx === 0
                    ? 'Today'
                    : day.date.toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
                <p className="text-[11px] text-gray-400">
                  {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <ul className="flex flex-col divide-y divide-gray-50">
                {day.dayAssignments.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-gray-400">Nothing due</li>
                ) : (
                  day.dayAssignments.map((a) => {
                    const type = getAssignmentType(a.name)
                    return (
                      <li key={a.id} className="px-3 py-2 flex flex-col gap-0.5">
                        <span className="text-xs font-light text-gray-800 leading-snug line-clamp-2">
                          {a.name}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {a.courseCode}
                          {type !== 'other' && (
                            <span className="ml-1.5 text-gray-300">· {type}</span>
                          )}
                        </span>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          )
        })()}
      </div>

      {/* Assignment list for selected week */}
      {selectedWeekIdx !== null && (
        <div className="flex flex-col gap-3 border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-xs font-light text-gray-900">
              {weeks[selectedWeekIdx].label}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {displayed.length} item{displayed.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleReschedule}
                disabled={rescheduleLoading || requestedWeeks.has(selectedWeekIdx)}
                className="text-xs font-light text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-default"
              >
                {rescheduleLoading
                  ? 'Sending…'
                  : requestedWeeks.has(selectedWeekIdx)
                  ? 'Requested ✓'
                  : 'Request Rescheduling'}
              </button>
            </div>
          </div>
          {displayed.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing due this week.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {displayed.map((a) => {
                const type = getAssignmentType(a.name)
                const score = getAssignmentScore(a.name)
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-light ${
                        type === 'ma'
                          ? 'bg-red-100 text-red-600'
                          : type === 'qa'
                          ? 'bg-amber-100 text-amber-700'
                          : type === 'hw'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {type === 'other' ? '–' : type}
                    </span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <a
                        href={safeHref(a.html_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-light text-gray-800 hover:text-black hover:underline"
                      >
                        {a.name}
                      </a>
                      <span className="text-xs text-gray-400">
                        {a.courseCode} · Due {new Date(a.due_at!).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </span>
                    </div>
                    {score > 0 && (
                      <span className="shrink-0 text-xs text-gray-400">+{score}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
