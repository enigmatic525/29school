'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import type { CanvasAssignment } from '@/lib/canvas-shared'
import { getAssignmentType, getAssignmentScore } from '@/lib/canvas-shared'
import { courseColor } from '@/lib/course-colors'
import SubmitModal from './SubmitModal'
import AssignmentDetail from './AssignmentDetail'

interface Props {
  assignments: CanvasAssignment[]
  showBoth?: boolean
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

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Parse YYYY-MM-DD as local noon to avoid UTC-midnight-to-previous-day shift.
function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

const TOTAL_WEEKS = 8
const CHART_DAYS = 30
const VW = 1000
const VH = 500
const L = 52
const R = 1000
const T = 14
const B = 458
const PW = R - L
const PH = B - T
const SLOT = PW / CHART_DAYS
const BAR_W = SLOT * 0.7

// ─── Move-to-date popup ───────────────────────────────────────────────────────

function MoveDatePopup({
  assignment,
  currentDateStr,
  onSelect,
  onClose,
}: {
  assignment: CanvasAssignment
  currentDateStr: string | undefined
  onSelect: (dateStr: string | null) => void
  onClose: () => void
}) {
  const actual = new Date(assignment.due_at!)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const actualStr = toDateStr(actual)

  const weekStart = mondayOf(today)
  const allDates: Date[] = []
  let cur = new Date(weekStart)
  while (cur <= actual) {
    allDates.push(new Date(cur))
    cur = addDays(cur, 1)
  }

  type WeekGroup = { label: string; dates: Date[] }
  const groups: WeekGroup[] = []
  for (const d of allDates) {
    const mon = mondayOf(d)
    const last = groups[groups.length - 1]
    const lastMon = last?.dates[0] ? mondayOf(last.dates[0]) : null
    if (!lastMon || mon.getTime() !== lastMon.getTime()) {
      groups.push({ label: `${fmt(mon)} – ${fmt(addDays(mon, 6))}`, dates: [d] })
    } else {
      last.dates.push(d)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/60 px-4 pb-4 sm:pb-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">{assignment.courseCode}</p>
            <h2 className="text-sm font-light text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
              {assignment.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 mt-0.5 text-xs text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-3 flex flex-col gap-3 max-h-72 overflow-y-auto">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Move planned date to…</p>
          {groups.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-1.5">
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.dates.map((d) => {
                  const str = toDateStr(d)
                  const isPast = d < today
                  const isActualDue = str === actualStr
                  const isCurrent = str === currentDateStr
                  return (
                    <button
                      key={str}
                      onClick={() => !isPast && onSelect(str)}
                      disabled={isPast}
                      className={`px-2.5 py-1 text-[11px] border transition-colors ${
                        isCurrent
                          ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                          : isActualDue
                          ? 'border-gray-400 text-gray-700 hover:border-gray-900 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-300'
                          : isPast
                          ? 'border-gray-100 text-gray-300 cursor-not-allowed dark:border-gray-800 dark:text-gray-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {isActualDue && <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">due</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {currentDateStr && currentDateStr !== actualStr && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5">
            <button
              onClick={() => onSelect(null)}
              className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Reset to actual due date
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Monthly calendar ─────────────────────────────────────────────────────────

function MonthCalendar({
  assignments,
  plannedDates,
  onMove,
  onDetail,
  highlightRange,
}: {
  assignments: CanvasAssignment[]
  plannedDates: Record<number, string>
  onMove: (a: CanvasAssignment) => void
  onDetail: (a: CanvasAssignment) => void
  highlightRange?: { start: Date; end: Date; nonce: number } | null
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragOverStr, setDragOverStr] = useState<string | null>(null)

  // When a week is highlighted from the heatmap, jump to its month if needed
  // so the user actually sees the flash. Comparing year+month avoids re-firing
  // on every viewDate change.
  useEffect(() => {
    if (!highlightRange) return
    const s = highlightRange.start
    setViewDate((prev) => {
      if (prev.getFullYear() === s.getFullYear() && prev.getMonth() === s.getMonth()) return prev
      return new Date(s.getFullYear(), s.getMonth(), 1)
    })
  }, [highlightRange])

  const highlightStartStr = highlightRange ? toDateStr(highlightRange.start) : null
  const highlightEndStr = highlightRange ? toDateStr(highlightRange.end) : null

  const draggingDueStr: string | null = dragId !== null
    ? (() => { const a = assignments.find((x) => x.id === dragId); return a ? toDateStr(new Date(a.due_at!)) : null })()
    : null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function getEff(a: CanvasAssignment): Date {
    const planned = plannedDates[a.id]
    if (planned) {
      const p = parseDateStr(planned)
      if (p <= new Date(a.due_at!)) return p
    }
    return new Date(a.due_at!)
  }

  // All calendar days for the current month view (Mon → Sun grid).
  const calendarDays = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const last = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)
    const gridStart = mondayOf(first)
    const lastDow = last.getDay()
    const gridEnd = addDays(last, lastDow === 0 ? 0 : 7 - lastDow)
    const days: Date[] = []
    let cur = new Date(gridStart)
    while (cur <= gridEnd) {
      days.push(new Date(cur))
      cur = addDays(cur, 1)
    }
    return days
  }, [viewDate])

  // Map YYYY-MM-DD → assignments planned/due that day.
  const byDay = useMemo(() => {
    const map: Record<string, CanvasAssignment[]> = {}
    for (const a of assignments) {
      const str = toDateStr(getEff(a))
      if (!map[str]) map[str] = []
      map[str].push(a)
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, plannedDates])

  function typeBg(type: ReturnType<typeof getAssignmentType>) {
    if (type === 'ma') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    if (type === 'qa') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    if (type === 'hw') return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-0">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
        >
          ←
        </button>
        <span className="text-sm font-light text-gray-900 dark:text-gray-100">{monthLabel}</span>
        <button
          onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
        >
          →
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-l border-t border-gray-200 dark:border-gray-800">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
          <div
            key={label}
            className="border-r border-b border-gray-200 dark:border-gray-800 py-1.5 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-gray-200 dark:border-gray-800">
        {calendarDays.map((day, i) => {
          const str = toDateStr(day)
          const inMonth = day.getMonth() === viewDate.getMonth()
          const isToday = day.getTime() === today.getTime()
          const isPast = day < today
          const items = byDay[str] ?? []
          const isOver = dragOverStr === str
          // Show all 4 if only 1 would be hidden — "+1 more" is never worth hiding.
          const showAll = items.length <= 4
          const shown = showAll ? items : items.slice(0, 3)
          const overflow = showAll ? 0 : items.length - 3
          // Invalid drop target: this day is after the dragged assignment's due date.
          const isInvalid = draggingDueStr !== null && str > draggingDueStr
          const isHighlighted = highlightStartStr !== null && highlightEndStr !== null
            && str >= highlightStartStr && str <= highlightEndStr
          const cellBg = isInvalid
            ? 'bg-gray-100 dark:bg-gray-800'
            : isOver
            ? 'bg-blue-50 dark:bg-blue-950/40'
            : !inMonth
            ? 'bg-gray-50/60 dark:bg-gray-900/40'
            : isToday
            ? 'bg-gray-50 dark:bg-gray-900'
            : 'bg-white dark:bg-gray-950'

          return (
            <div
              key={i}
              onDragOver={(e) => { if (!isInvalid) { e.preventDefault(); setDragOverStr(str) } }}
              onDragLeave={(e) => {
                const rel = e.relatedTarget as Node | null
                if (!rel || !e.currentTarget.contains(rel)) setDragOverStr(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                const id = Number(e.dataTransfer.getData('text/plain'))
                const a = assignments.find((x) => x.id === id)
                if (a && str <= toDateStr(new Date(a.due_at!))) {
                  onMove(Object.assign({}, a, { __dropDate: str }))
                }
                setDragOverStr(null)
                setDragId(null)
              }}
              className={`relative min-h-[120px] border-r border-b border-gray-200 dark:border-gray-800 p-1.5 flex flex-col gap-1 transition-colors ${cellBg}`}
            >
              {isHighlighted && highlightRange && (
                <div
                  key={highlightRange.nonce}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-red-400 dark:ring-red-500"
                  style={{ animation: 'week-highlight-fade 3s ease-out forwards' }}
                />
              )}

              {/* Date number */}
              <div className="flex justify-end mb-0.5">
                <span
                  className={`text-[10px] leading-none flex items-center justify-center ${
                    isToday
                      ? 'w-4 h-4 rounded-full bg-gray-900 text-white text-[9px] dark:bg-gray-100 dark:text-gray-900'
                      : inMonth
                      ? isPast ? 'text-gray-300 dark:text-gray-700' : 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-200 dark:text-gray-700'
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Assignment chips */}
              {shown.map((a) => {
                const type = getAssignmentType(a.name)
                const isShifted = !!plannedDates[a.id]
                const color = courseColor(a.courseCode)
                return (
                  <div
                    key={a.id}
                    draggable
                    onClick={() => onDetail(a)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(a.id))
                      e.dataTransfer.effectAllowed = 'move'
                      setDragId(a.id)
                    }}
                    onDragEnd={() => { setDragId(null); setDragOverStr(null) }}
                    className={`flex items-center gap-1 px-1 py-0.5 rounded-sm text-[10px] leading-tight cursor-pointer select-none transition-opacity ${
                      dragId === a.id ? 'opacity-40' : isInvalid ? 'opacity-40' : ''
                    } ${typeBg(type)}`}
                    title={`${a.courseCode ?? ''} · ${a.name}`}
                  >
                    <span className={`w-1 h-3 rounded-sm shrink-0 ${color.dot}`} aria-hidden />
                    <span className="truncate flex-1 min-w-0">{a.name}</span>
                    {isShifted && (
                      <span className="shrink-0 opacity-50 text-[8px]">↑</span>
                    )}
                  </div>
                )
              })}

              {overflow > 0 && (
                <span className="text-[9px] text-gray-400 dark:text-gray-500 px-1">+{overflow} more</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-gray-400 dark:text-gray-500">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-100 dark:bg-red-950/40 inline-block"/>MA</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-100 dark:bg-amber-950/40 inline-block"/>QA</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-100 dark:bg-blue-950/40 inline-block"/>HW</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-100 dark:bg-gray-800 inline-block"/>Other</span>
        <span className="ml-auto opacity-60">↑ = shifted from due date</span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarHeatmap({ assignments, showBoth = false }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar'>('calendar')
  const [highlightWeek, setHighlightWeek] = useState<{ start: Date; end: Date; nonce: number } | null>(null)
  const [submittingAssignment, setSubmittingAssignment] = useState<CanvasAssignment | null>(null)
  const [movingAssignment, setMovingAssignment] = useState<CanvasAssignment | null>(null)
  const [detailAssignment, setDetailAssignment] = useState<CanvasAssignment | null>(null)
  const [tooltip, setTooltip] = useState<{
    dayIdx: number; x: number; y: number; containerWidth: number
  } | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
  }, [])

  const [plannedDates, setPlannedDatesState] = useState<Record<number, string>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem('29-planned-dates')
      if (raw) setPlannedDatesState(JSON.parse(raw))
    } catch {}
  }, [])

  function setPlannedDate(id: number, dateStr: string | null) {
    setPlannedDatesState((prev) => {
      const next = { ...prev }
      if (dateStr === null) delete next[id]
      else next[id] = dateStr
      try { localStorage.setItem('29-planned-dates', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function effectiveDate(a: CanvasAssignment): Date {
    const planned = plannedDates[a.id]
    if (planned) {
      const p = parseDateStr(planned)
      if (p <= new Date(a.due_at!)) return p
    }
    return new Date(a.due_at!)
  }

  // Calendar view passes drops back through onMove with a __dropDate sentinel.
  function handleCalendarMove(a: CanvasAssignment & { __dropDate?: string }) {
    if (a.__dropDate) {
      setPlannedDate(a.id, a.__dropDate)
    } else {
      setMovingAssignment(a)
    }
  }

  function chooseWeek(i: number) {
    const week = weeks[i]
    if (!week) return
    setTooltip(null)
    setHighlightWeek((prev) => ({
      start: week.start,
      end: week.end,
      nonce: (prev?.nonce ?? 0) + 1,
    }))
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightWeek(null), 3000)
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
        const eff = effectiveDate(a)
        return eff >= cur && eff <= weekEnd
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, plannedDates])

  const dailyData = useMemo(() => {
    const todayMs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() })()
    const start = new Date(todayMs)
    return Array.from({ length: CHART_DAYS }, (_, i) => {
      const dayStart = addDays(start, i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)
      const dayAssignments = assignments.filter((a) => {
        const eff = effectiveDate(a)
        return eff >= dayStart && eff <= dayEnd
      })
      const score = dayAssignments.reduce((sum, a) => sum + getAssignmentScore(a.name), 0)
      return { date: dayStart, score, dayAssignments, isToday: dayStart.getTime() === todayMs }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, plannedDates])

  const maxDailyScore = useMemo(
    () => Math.max(...dailyData.map((d) => d.score), 1),
    [dailyData]
  )

  const ticks = yTicks(maxDailyScore)

  return (
    <>
      {/* Tab switcher — hidden in showBoth mode */}
      {!showBoth && (
        <div className="flex gap-5 border-b border-gray-200 dark:border-gray-800 mb-6">
          {(['overview', 'calendar'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 text-xs font-light capitalize border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* ── Overview tab ── */}
      {(activeTab === 'overview' || showBoth) && (
        <div className="flex flex-col gap-6">
          {/* 8-week heatmap */}
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {weeks.map((week, i) => {
              const isRed = week.score >= 30
              return (
                <button
                  key={i}
                  onClick={() => chooseWeek(i)}
                  className={`flex flex-col gap-1 border p-2 text-left transition-all ${
                    isRed
                      ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-[9px] leading-tight text-gray-400 dark:text-gray-500 break-words">
                    {fmt(week.start)}–{fmt(week.end)}
                  </span>
                  <span className={`text-lg font-light leading-none ${isRed ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {week.score}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 30-day bar chart */}
          <div ref={chartRef} className="relative w-full" style={{ aspectRatio: '2 / 1' }}>
            <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
              {ticks.map((tick) => {
                const y = B - (tick / maxDailyScore) * PH
                return (
                  <g key={tick}>
                    <line x1={L} y1={y} x2={R} y2={y}
                      stroke={tick === 0 ? '#d1d5db' : '#f3f4f6'}
                      strokeWidth={tick === 0 ? 1 : 0.75}
                    />
                    <text x={L - 8} y={y + 4} textAnchor="end" fontSize={20} fill="#9ca3af" fontFamily="inherit">
                      {tick}
                    </text>
                  </g>
                )
              })}
              <line x1={L} y1={T} x2={L} y2={B} stroke="#e5e7eb" strokeWidth={0.75} />
              {dailyData.map(({ score, date, isToday }, i) => {
                const barH = score > 0 ? Math.max(2, (score / maxDailyScore) * PH) : 0
                const cx = L + (i + 0.5) * SLOT
                const bx = cx - BAR_W / 2
                const by = B - barH
                const showLabel = i === 0 || i % 7 === 0
                const label = isToday ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const isHovered = tooltip?.dayIdx === i
                return (
                  <g key={i}
                    onMouseMove={(e) => {
                      const rect = chartRef.current?.getBoundingClientRect()
                      if (!rect) return
                      setTooltip({ dayIdx: i, x: e.clientX - rect.left, y: e.clientY - rect.top, containerWidth: rect.width })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: 'default' }}
                  >
                    <rect x={L + i * SLOT} y={T} width={SLOT} height={PH + 10} fill="transparent" />
                    {barH > 0 && (
                      <rect x={bx} y={by} width={BAR_W} height={barH} rx={2} ry={2}
                        fill={isHovered ? '#374151' : isToday ? '#6b7280' : '#9ca3af'}
                        style={{ transition: 'fill 120ms ease' }}
                      />
                    )}
                    {showLabel && (
                      <>
                        <line x1={cx} y1={B} x2={cx} y2={B + 6} stroke="#d1d5db" strokeWidth={0.75} />
                        <text x={cx} y={B + 28} textAnchor="middle" fontSize={18}
                          fill={isToday ? '#6b7280' : '#9ca3af'} fontFamily="inherit">
                          {label}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}
            </svg>

            {tooltip !== null && (() => {
              const day = dailyData[tooltip.dayIdx]
              const TW = 224
              const rawLeft = tooltip.dayIdx < 15 ? tooltip.x + 14 : tooltip.x - 14 - TW
              const leftPos = Math.max(4, Math.min(rawLeft, tooltip.containerWidth - TW - 4))
              return (
                <div className="absolute z-50 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg pointer-events-none"
                  style={{ left: leftPos, top: Math.max(4, tooltip.y - 16), width: TW }}>
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-light text-gray-900 dark:text-gray-100">
                      {day.isToday ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <ul className="flex flex-col divide-y divide-gray-50 dark:divide-gray-800">
                    {day.dayAssignments.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Nothing planned</li>
                    ) : (
                      day.dayAssignments.map((a) => {
                        const type = getAssignmentType(a.name)
                        return (
                          <li key={a.id} className="px-3 py-2 flex flex-col gap-0.5">
                            <span className="text-xs font-light text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">{a.name}</span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                              {a.courseCode}
                              {type !== 'other' && <span className="ml-1.5 text-gray-300 dark:text-gray-600">· {type}</span>}
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

          {/* Scoring legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="font-medium text-gray-500 dark:text-gray-400">Scoring:</span>
            <span className="inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-light bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300">MA · 10</span>
            <span className="inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-light bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">QA · 5</span>
            <span className="inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-light bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">HW · 1</span>
            <span className="inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-light bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Other · 0</span>
            <span className="ml-auto">Weeks with score ≥ 30 are flagged red.</span>
          </div>
        </div>
      )}

      {/* ── Calendar tab ── */}
      {(activeTab === 'calendar' || showBoth) && (
        <>
        {showBoth && <div className="border-t border-gray-200 dark:border-gray-800 my-8" />}
        <MonthCalendar
          assignments={assignments}
          plannedDates={plannedDates}
          onMove={handleCalendarMove}
          onDetail={(a) => setDetailAssignment(a)}
          highlightRange={highlightWeek}
        />
        </>
      )}

      {submittingAssignment && (
        <SubmitModal
          assignment={submittingAssignment}
          onClose={() => setSubmittingAssignment(null)}
        />
      )}

      {movingAssignment && (
        <MoveDatePopup
          assignment={movingAssignment}
          currentDateStr={plannedDates[movingAssignment.id]}
          onSelect={(dateStr) => {
            setPlannedDate(movingAssignment.id, dateStr)
            setMovingAssignment(null)
          }}
          onClose={() => setMovingAssignment(null)}
        />
      )}

      {detailAssignment && (
        <AssignmentDetail
          assignment={detailAssignment}
          plannedDate={plannedDates[detailAssignment.id]}
          onMove={() => { setMovingAssignment(detailAssignment); setDetailAssignment(null) }}
          onClose={() => setDetailAssignment(null)}
        />
      )}
    </>
  )
}
