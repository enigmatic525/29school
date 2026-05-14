'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { CanvasAssignment } from '@/lib/canvas-shared'
import { getAssignmentType } from '@/lib/canvas-shared'
import type { CustomTask } from '@/lib/custom-tasks'
import { loadCustomTasks, saveCustomTasks } from '@/lib/custom-tasks'
import { courseColor } from '@/lib/course-colors'
import CalendarHeatmap from './CalendarHeatmap'
import AssignmentDetail from './AssignmentDetail'
import WeeklyTrackerSidebar, { type WeekStats } from './WeeklyTrackerSidebar'

function isAssignmentSubmitted(a: CanvasAssignment): boolean {
  return (
    !!a.submittedAt ||
    a.submissionState === 'submitted' ||
    a.submissionState === 'graded' ||
    a.submissionState === 'pending_review'
  )
}

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
  tasks: CustomTask[]
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
  const submitted = isAssignmentSubmitted(assignment)
  const done = isCompleted || submitted
  const overdue = isPast && !submitted
  const color = courseColor(assignment.courseCode)

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 last:border-b-0 group transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${
        done || isPast ? 'opacity-50' : ''
      }`}
    >
      <button
        onClick={onToggleComplete}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        title={submitted ? 'Submitted on Canvas — click to override locally' : undefined}
        className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
          done
            ? 'bg-emerald-500 border-emerald-500 dark:bg-emerald-400 dark:border-emerald-400'
            : 'border-gray-300 hover:border-gray-500 dark:border-gray-600 dark:hover:border-gray-400'
        }`}
      >
        {done && (
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

      <button onClick={onDetail} className="flex-1 text-left min-w-0 flex items-center gap-2">
        <span className={`text-sm font-light leading-snug block truncate transition-colors ${
          done
            ? 'line-through text-gray-300 dark:text-gray-600'
            : overdue
            ? 'text-red-700 dark:text-red-400 group-hover:text-red-900 dark:group-hover:text-red-300'
            : 'text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100'
        }`}>
          {assignment.name}
        </span>
        {assignment.isLate && !submitted && (
          <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded-sm leading-none bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60">
            Late
          </span>
        )}
        {assignment.isMissing && (
          <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded-sm leading-none bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60">
            Missing
          </span>
        )}
        {submitted && (
          <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded-sm leading-none bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
            {assignment.submissionState === 'graded' ? 'Graded' : 'Submitted'}
          </span>
        )}
      </button>

      <div className="shrink-0 text-right hidden sm:flex items-center gap-2">
        {assignment.courseCode && (
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} aria-hidden />
            <span className={`text-[11px] leading-none ${color.text}`}>{assignment.courseCode}</span>
          </span>
        )}
        <span className="text-[10px] text-gray-300 dark:text-gray-600 leading-none">{dueTime}</span>
      </div>
      <div className="shrink-0 sm:hidden flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} aria-hidden />
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{dueTime}</span>
      </div>
    </div>
  )
}

// ─── Custom task row ──────────────────────────────────────────────────────────

function TaskRow({
  task,
  isPast,
  onToggle,
  onDelete,
}: {
  task: CustomTask
  isPast: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const { done } = task
  const overdue = isPast && !done
  const color = courseColor(task.courseCode)

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 last:border-b-0 group transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${
        done || isPast ? 'opacity-50' : ''
      }`}
    >
      <button
        onClick={onToggle}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
          done
            ? 'bg-emerald-500 border-emerald-500 dark:bg-emerald-400 dark:border-emerald-400'
            : 'border-gray-300 hover:border-gray-500 dark:border-gray-600 dark:hover:border-gray-400'
        }`}
      >
        {done && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>

      <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded-sm leading-none bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
        TASK
      </span>

      <span className={`flex-1 min-w-0 text-sm font-light leading-snug truncate transition-colors ${
        done
          ? 'line-through text-gray-300 dark:text-gray-600'
          : overdue
          ? 'text-red-700 dark:text-red-400'
          : 'text-gray-800 dark:text-gray-200'
      }`}>
        {task.title}
      </span>

      {task.courseCode && (
        <span className="shrink-0 hidden sm:inline-flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} aria-hidden />
          <span className={`text-[11px] leading-none ${color.text}`}>{task.courseCode}</span>
        </span>
      )}

      <button
        onClick={onDelete}
        aria-label="Delete task"
        title="Delete task"
        className="shrink-0 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
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
  const [search, setSearch] = useState<string>('')
  const [hideSubmitted, setHideSubmitted] = useState(false)
  const todayAnchorRef = useRef<HTMLDivElement | null>(null)
  const hasScrolledRef = useRef(false)
  const [returnArrow, setReturnArrow] = useState<'up' | 'down' | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([])
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDate, setNewTaskDate] = useState(() => toDateStr(new Date()))
  const [newTaskCourse, setNewTaskCourse] = useState('')
  const newTaskInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('29-completed-assignments')
      if (raw) setCompletedIds(new Set(JSON.parse(raw)))
    } catch {}
    try {
      const raw = localStorage.getItem('29-planned-dates')
      if (raw) setPlannedDates(JSON.parse(raw))
    } catch {}
    try {
      const raw = localStorage.getItem('29-dashboard-filters')
      if (raw) {
        const v = JSON.parse(raw) as { course?: string; hideSubmitted?: boolean }
        if (typeof v.course === 'string') setFilterCourse(v.course)
        if (typeof v.hideSubmitted === 'boolean') setHideSubmitted(v.hideSubmitted)
      }
    } catch {}
    setCustomTasks(loadCustomTasks())
  }, [])

  // Persist filter state so it survives reload — but not search, since a
  // stale search the next morning would silently hide today's work.
  useEffect(() => {
    try {
      localStorage.setItem('29-dashboard-filters', JSON.stringify({
        course: filterCourse,
        hideSubmitted,
      }))
    } catch {}
  }, [filterCourse, hideSubmitted])

  function toggleComplete(id: number) {
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem('29-completed-assignments', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function persistTasks(next: CustomTask[]) {
    saveCustomTasks(next)
    setCustomTasks(next)
  }

  function addTask() {
    const title = newTaskTitle.trim()
    if (!title || !newTaskDate) return
    persistTasks([
      ...customTasks,
      { id: crypto.randomUUID(), title, date: newTaskDate, courseCode: newTaskCourse || undefined, done: false },
    ])
    setNewTaskTitle('')
    setNewTaskCourse('')
    newTaskInputRef.current?.focus()
  }

  function toggleTask(id: string) {
    persistTasks(customTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function deleteTask(id: string) {
    persistTasks(customTasks.filter((t) => t.id !== id))
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

    const q = search.trim().toLowerCase()
    const filtered = assignments.filter((a) => {
      if (filterCourse && a.courseCode !== filterCourse) return false
      if (q && !a.name.toLowerCase().includes(q) && !(a.courseCode ?? '').toLowerCase().includes(q)) return false
      if (hideSubmitted && isAssignmentSubmitted(a)) return false
      return true
    })

    filtered.sort((a, b) => {
      const da = effectiveDate(a).getTime()
      const db = effectiveDate(b).getTime()
      return da !== db ? da - db : a.name.localeCompare(b.name)
    })

    const filteredTasks = customTasks.filter((t) => {
      if (filterCourse && t.courseCode !== filterCourse) return false
      if (q && !t.title.toLowerCase().includes(q) && !(t.courseCode ?? '').toLowerCase().includes(q)) return false
      return true
    })

    const map = new Map<string, { assignments: CanvasAssignment[]; tasks: CustomTask[] }>()
    function bucket(key: string) {
      let entry = map.get(key)
      if (!entry) { entry = { assignments: [], tasks: [] }; map.set(key, entry) }
      return entry
    }
    for (const a of filtered) {
      const d = new Date(effectiveDate(a))
      d.setHours(0, 0, 0, 0)
      bucket(toDateStr(d)).assignments.push(a)
    }
    for (const t of filteredTasks) {
      bucket(t.date).tasks.push(t)
    }
    for (const entry of map.values()) {
      entry.tasks.sort((a, b) => a.title.localeCompare(b.title))
    }

    const result: DateGroup[] = []
    // Tasks can land on dates outside the assignment sort order, so sort the
    // day keys explicitly rather than relying on Map insertion order.
    for (const key of [...map.keys()].sort()) {
      const entry = map.get(key)!
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
      result.push({ key, label, sublabel, isToday, isTomorrow, isPast, assignments: entry.assignments, tasks: entry.tasks })
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, customTasks, plannedDates, filterCourse, search, hideSubmitted, completedIds])

  // Completion ring scope: the current calendar week (Mon–Sun), so the ratio
  // stays bounded and meaningful. Course/search filters apply; "hide submitted"
  // does not — submitted work still counts as done here.
  const weekStats = useMemo<WeekStats>(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const dow = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const startStr = toDateStr(monday)
    const endStr = toDateStr(sunday)
    const q = search.trim().toLowerCase()

    const byCourse = new Map<string, { count: number; done: number }>()
    let total = 0
    let done = 0

    for (const a of assignments) {
      if (filterCourse && a.courseCode !== filterCourse) continue
      if (q && !a.name.toLowerCase().includes(q) && !(a.courseCode ?? '').toLowerCase().includes(q)) continue
      const ds = toDateStr(effectiveDate(a))
      if (ds < startStr || ds > endStr) continue
      const code = a.courseCode || 'Other'
      const isDone = completedIds.has(a.id) || isAssignmentSubmitted(a)
      const e = byCourse.get(code) ?? { count: 0, done: 0 }
      e.count++
      if (isDone) e.done++
      byCourse.set(code, e)
      total++
      if (isDone) done++
    }
    for (const t of customTasks) {
      if (filterCourse && t.courseCode !== filterCourse) continue
      if (q && !t.title.toLowerCase().includes(q) && !(t.courseCode ?? '').toLowerCase().includes(q)) continue
      if (t.date < startStr || t.date > endStr) continue
      const code = t.courseCode || 'Other'
      const e = byCourse.get(code) ?? { count: 0, done: 0 }
      e.count++
      if (t.done) e.done++
      byCourse.set(code, e)
      total++
      if (t.done) done++
    }

    const segments = [...byCourse.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, v]) => ({
        code,
        count: v.count,
        done: v.done,
        color: courseColor(code === 'Other' ? undefined : code),
      }))

    const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { total, done, segments, rangeLabel: `${fmtShort(monday)} – ${fmtShort(sunday)}` }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, customTasks, completedIds, filterCourse, search, plannedDates])

  const upcomingCount = useMemo(() => {
    return groups.reduce(
      (n, g) => n + (g.isPast ? 0 : g.assignments.length + g.tasks.length),
      0,
    )
  }, [groups])
  const totalCompleted =
    assignments.filter((a) => completedIds.has(a.id)).length +
    customTasks.filter((t) => t.done).length
  const submittedCount = useMemo(
    () => assignments.filter((a) => isAssignmentSubmitted(a) && (!filterCourse || a.courseCode === filterCourse)).length,
    [assignments, filterCourse],
  )

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

  // Keyboard shortcuts. `/` focuses search, `t` jumps to today. Skipped
  // while a text field is focused or a modal is open so they don't hijack
  // typing or steal focus from elements visible to the user.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (detailAssignment) return
      const tag = (e.target as HTMLElement | null)?.tagName
      const editable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (e.target as HTMLElement | null)?.isContentEditable
      if (editable) return
      if (e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        scrollToToday()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailAssignment])

  return (
    <>
      <WeeklyTrackerSidebar weekStats={weekStats} />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <p className="text-xs text-gray-400 dark:text-gray-500 mr-auto">
          {upcomingCount} upcoming
          {totalCompleted > 0 && <span className="ml-2 text-gray-300 dark:text-gray-600">· {totalCompleted} completed</span>}
        </p>

        <div className="relative">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search assignments"
            className="pl-7 pr-2 py-1 w-32 sm:w-44 text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
          />
          {!search && (
            <kbd className="hidden sm:inline absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-300 dark:text-gray-600 border border-gray-200 dark:border-gray-700 px-1 leading-none py-0.5 pointer-events-none">/</kbd>
          )}
        </div>

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

        <button
          onClick={() => setHideSubmitted((v) => !v)}
          className={`text-xs border px-2 py-1 transition-colors ${
            hideSubmitted
              ? 'border-gray-700 dark:border-gray-300 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          aria-pressed={hideSubmitted}
        >
          {hideSubmitted
            ? submittedCount > 0 ? `Submitted hidden (${submittedCount})` : 'Submitted hidden'
            : 'Hide submitted'}
        </button>

        <button
          onClick={() => {
            const next = !showAddTask
            setShowAddTask(next)
            if (next) requestAnimationFrame(() => newTaskInputRef.current?.focus())
          }}
          className={`text-xs border px-2 py-1 transition-colors ${
            showAddTask
              ? 'border-gray-700 dark:border-gray-300 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          aria-expanded={showAddTask}
        >
          {showAddTask ? 'Cancel' : '+ Add task'}
        </button>
      </div>

      {showAddTask && (
        <div className="mb-5 border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 p-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label htmlFor="new-task-title" className="text-[10px] text-gray-400 dark:text-gray-500">Task</label>
            <input
              id="new-task-title"
              ref={newTaskInputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTask() } }}
              placeholder="e.g. Study for bio quiz"
              className="px-2 py-1 text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="new-task-date" className="text-[10px] text-gray-400 dark:text-gray-500">Date</label>
            <input
              id="new-task-date"
              type="date"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
              className="px-2 py-1 text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
            />
          </div>
          {courses.length > 0 && (
            <div className="flex flex-col gap-1">
              <label htmlFor="new-task-course" className="text-[10px] text-gray-400 dark:text-gray-500">Course</label>
              <select
                id="new-task-course"
                value={newTaskCourse}
                onChange={(e) => setNewTaskCourse(e.target.value)}
                className="px-2 py-1 text-xs text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <option value="">No course</option>
                {courses.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <button
            onClick={addTask}
            disabled={!newTaskTitle.trim() || !newTaskDate}
            className="px-4 py-1 text-xs font-light text-white dark:text-gray-900 bg-gray-900 dark:bg-gray-100 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {search || filterCourse || hideSubmitted ? 'No assignments match your filters.' : 'No assignments or tasks to show.'}
          </p>
          {(search || filterCourse || hideSubmitted) && (
            <button
              onClick={() => { setSearch(''); setFilterCourse(''); setHideSubmitted(false) }}
              className="mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Clear filters →
            </button>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {groups.map((group) => (
            <div
              key={group.key}
              ref={group.key === todayAnchorKey ? todayAnchorRef : undefined}
              className="scroll-mt-28"
            >
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
                  {group.assignments.length + group.tasks.length}
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
                {group.tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    isPast={group.isPast}
                    onToggle={() => toggleTask(t.id)}
                    onDelete={() => deleteTask(t.id)}
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
        <span className="hidden sm:inline-flex items-center gap-2 ml-2 opacity-70">
          <kbd className="text-[9px] border border-gray-200 dark:border-gray-700 px-1 leading-none py-0.5">/</kbd> search
          <kbd className="text-[9px] border border-gray-200 dark:border-gray-700 px-1 leading-none py-0.5">t</kbd> today
        </span>
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('29-canvas-tab')
      if (raw === 'dashboard' || raw === 'edit') setActiveTab(raw)
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('29-canvas-tab', activeTab) } catch {}
  }, [activeTab])

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard' },
    { id: 'edit' as const, label: 'Edit' },
  ]

  return (
    <>
      <div className="sticky top-[52px] z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 mb-6 bg-white/95 dark:bg-[var(--background)]/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-5">
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
