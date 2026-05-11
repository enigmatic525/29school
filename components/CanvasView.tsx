'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { CanvasAssignment } from '@/lib/canvas-shared'
import { getAssignmentType } from '@/lib/canvas-shared'
import CalendarHeatmap from './CalendarHeatmap'
import AssignmentDetail from './AssignmentDetail'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

interface DateGroup {
  key: string
  label: string
  sublabel: string
  isToday: boolean
  isTomorrow: boolean
  isPast: boolean
  assignments: CanvasAssignment[]
}

function typeBadgeClass(type: ReturnType<typeof getAssignmentType>) {
  if (type === 'ma') return 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60'
  if (type === 'qa') return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
  if (type === 'hw') return 'bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'
  return 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
}

// ─── Assignment row ───────────────────────────────────────────────────────────

function AssignmentRow({
  assignment,
  isCompleted,
  isPast,
  onToggleComplete,
  onDetail,
}: {
  assignment: CanvasAssignment
  isCompleted: boolean
  isPast: boolean
  onToggleComplete: () => void
  onDetail: () => void
}) {
  const type = getAssignmentType(assignment.name)
  const due = new Date(assignment.due_at!)
  const dueTime = due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 last:border-b-0 group transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${
        isCompleted || isPast ? 'opacity-50' : ''
      }`}
    >
      <button
        onClick={onToggleComplete}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
          isCompleted
            ? 'bg-gray-500 border-gray-500 dark:bg-gray-400 dark:border-gray-400'
            : 'border-gray-300 hover:border-gray-500 dark:border-gray-600 dark:hover:border-gray-400'
        }`}
      >
        {isCompleted && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>

      {type !== 'other' && (
        <span className={`shrink-0 px-1.5 py-0.5 text-[10px] rounded-sm leading-none ${typeBadgeClass(type)}`}>
          {type.toUpperCase()}
        </span>
      )}

      <button onClick={onDetail} className="flex-1 text-left min-w-0">
        <span className={`text-sm font-light leading-snug block truncate transition-colors ${
          isCompleted
            ? 'line-through text-gray-300 dark:text-gray-600'
            : 'text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100'
        }`}>
          {assignment.name}
        </span>
      </button>

      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-none mb-0.5">{assignment.courseCode}</p>
        <p className="text-[10px] text-gray-300 dark:text-gray-600 leading-none">{dueTime}</p>
      </div>
      <div className="shrink-0 sm:hidden">
        <p className="text-[10px] text-gray-400 dark:text-gray-500">{dueTime}</p>
      </div>
    </div>
  )
}

// ─── Dashboard tab (upcoming) ─────────────────────────────────────────────────

function DashboardTab({
  assignments,
  onSwitchToEdit,
}: {
  assignments: CanvasAssignment[]
  onSwitchToEdit: () => void
}) {
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [plannedDates, setPlannedDates] = useState<Record<number, string>>({})
  const [detailAssignment, setDetailAssignment] = useState<CanvasAssignment | null>(null)
  const [filterCourse, setFilterCourse] = useState<string>('')
  const todayAnchorRef = useRef<HTMLDivElement | null>(null)
  const hasScrolledRef = useRef(false)
  const [returnArrow, setReturnArrow] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('29-completed-assignments')
      if (raw) setCompletedIds(new Set(JSON.parse(raw)))
    } catch {}
    try {
      const raw = localStorage.getItem('29-planned-dates')
      if (raw) setPlannedDates(JSON.parse(raw))
    } catch {}
  }, [])

  function toggleComplete(id: number) {
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem('29-completed-assignments', JSON.stringify([...next])) } catch {}
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

  const courses = useMemo(() => {
    const seen = new Set<string>()
    return assignments
      .filter((a) => a.courseCode && !seen.has(a.courseCode!) && seen.add(a.courseCode!))
      .map((a) => a.courseCode!)
      .sort()
  }, [assignments])

  const groups = useMemo((): DateGroup[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const todayStr = toDateStr(today)
    const tomorrowStr = toDateStr(tomorrow)
    const yesterdayStr = toDateStr(yesterday)

    const filtered = assignments.filter((a) => {
      if (filterCourse && a.courseCode !== filterCourse) return false
      return true
    })

    filtered.sort((a, b) => {
      const da = effectiveDate(a).getTime()
      const db = effectiveDate(b).getTime()
      return da !== db ? da - db : a.name.localeCompare(b.name)
    })

    const map = new Map<string, CanvasAssignment[]>()
    for (const a of filtered) {
      const d = new Date(effectiveDate(a))
      d.setHours(0, 0, 0, 0)
      const key = toDateStr(d)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }

    const result: DateGroup[] = []
    for (const [key, items] of map) {
      const isToday = key === todayStr
      const isTomorrow = key === tomorrowStr
      const isYesterday = key === yesterdayStr
      const isPast = key < todayStr
      const date = parseDateStr(key)
      const label = isToday
        ? 'Today'
        : isTomorrow
        ? 'Tomorrow'
        : isYesterday
        ? 'Yesterday'
        : date.toLocaleDateString('en-US', { weekday: 'long' })
      const sublabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      result.push({ key, label, sublabel, isToday, isTomorrow, isPast, assignments: items })
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, plannedDates, filterCourse])

  const upcomingCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return groups.reduce(
      (n, g) => n + (g.isPast ? 0 : g.assignments.length),
      0,
    )
  }, [groups])
  const totalCompleted = assignments.filter((a) => completedIds.has(a.id)).length

  // Land on Today (or the first non-past group) on mount, so the user can
  // scroll up to past dates like Canvas Planner.
  useEffect(() => {
    if (hasScrolledRef.current) return
    if (groups.length === 0) return
    const target = todayAnchorRef.current
    if (!target) return
    hasScrolledRef.current = true
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start' })
    })
  }, [groups])

  const todayAnchorKey = useMemo(() => {
    const firstUpcoming = groups.find((g) => !g.isPast)
    return firstUpcoming?.key ?? null
  }, [groups])

  // Show a floating "Today" button whenever the anchor is off-screen; the
  // arrow points in the direction the user needs to scroll to reach it.
  useEffect(() => {
    const target = todayAnchorRef.current
    if (!target) {
      setReturnArrow(null)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReturnArrow(null)
        } else {
          setReturnArrow(entry.boundingClientRect.top < 0 ? 'up' : 'down')
        }
      },
      { threshold: 0 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [todayAnchorKey])

  function scrollToToday() {
    todayAnchorRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <p className="text-xs text-gray-400 dark:text-gray-500 mr-auto">
          {upcomingCount} upcoming
          {totalCompleted > 0 && <span className="ml-2 text-gray-300 dark:text-gray-600">· {totalCompleted} completed</span>}
        </p>

        {courses.length > 1 && (
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="text-xs text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-2 py-1 outline-none hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-900"
          >
            <option value="">All courses</option>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No assignments to show.</p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {groups.map((group) => (
            <div key={group.key} ref={group.key === todayAnchorKey ? todayAnchorRef : undefined}>
              <div className={`flex items-baseline gap-2 px-4 py-2.5 ${
                group.isToday
                  ? 'bg-gray-900 dark:bg-gray-700'
                  : group.isTomorrow
                  ? 'bg-gray-100 dark:bg-gray-800'
                  : group.isPast
                  ? 'bg-gray-50/60 dark:bg-gray-900/40'
                  : 'bg-gray-50 dark:bg-gray-900'
              }`}>
                <span className={`text-xs font-medium ${
                  group.isToday
                    ? 'text-white'
                    : group.isPast
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-700 dark:text-gray-200'
                }`}>
                  {group.label}
                </span>
                <span className={`text-[11px] ${
                  group.isToday
                    ? 'text-gray-400 dark:text-gray-300'
                    : group.isPast
                    ? 'text-gray-300 dark:text-gray-600'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {group.sublabel}
                </span>
                <span className={`ml-auto text-[10px] ${group.isToday ? 'text-gray-500 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}>
                  {group.assignments.length}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-950 divide-y divide-gray-50 dark:divide-gray-800">
                {group.assignments.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    isCompleted={completedIds.has(a.id)}
                    isPast={group.isPast}
                    onToggleComplete={() => toggleComplete(a.id)}
                    onDetail={() => setDetailAssignment(a)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-gray-400 dark:text-gray-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-100 border border-red-200 dark:bg-red-950/40 dark:border-red-900/60 inline-block"/>MA</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-100 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 inline-block"/>QA</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60 inline-block"/>HW</span>
        <button onClick={onSwitchToEdit} className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          Calendar view →
        </button>
      </div>

      {detailAssignment && (
        <AssignmentDetail
          assignment={detailAssignment}
          plannedDate={plannedDates[detailAssignment.id]}
          onMove={() => { setDetailAssignment(null); onSwitchToEdit() }}
          onClose={() => setDetailAssignment(null)}
        />
      )}

      {returnArrow && (
        <button
          onClick={scrollToToday}
          aria-label="Return to today"
          title="Return to today"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: returnArrow === 'down' ? 'rotate(180deg)' : undefined }}>
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function CanvasView({ assignments }: { assignments: CanvasAssignment[] }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'edit'>('dashboard')

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard' },
    { id: 'edit' as const, label: 'Edit' },
  ]

  return (
    <>
      <div className="flex gap-5 border-b border-gray-200 dark:border-gray-800 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2.5 text-xs font-light border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <DashboardTab
          assignments={assignments}
          onSwitchToEdit={() => setActiveTab('edit')}
        />
      )}

      {activeTab === 'edit' && (
        <CalendarHeatmap assignments={assignments} showBoth />
      )}
    </>
  )
}
