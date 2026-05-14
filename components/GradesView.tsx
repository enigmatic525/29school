'use client'

import { useState, useEffect, useMemo } from 'react'
import type {
  CourseGrade,
  CourseGradeBreakdown,
  GradedSubmission,
} from '@/lib/canvas-shared'
import { getAssignmentType } from '@/lib/canvas-shared'
import { projectedTotal, groupPercent, generateSampleScores } from '@/lib/grade-target'
import { courseColor } from '@/lib/course-colors'

const LS_KEY = '29-hidden-grades'
// EastsidePrep's A cutoff — the target the "Generate Sample" button aims for.
const A_CUTOFF = 93

function gradeColor(score: number | null): string {
  if (score === null) return 'text-gray-400 dark:text-gray-500'
  if (score >= 90) return 'text-green-600 dark:text-green-400'
  if (score >= 80) return 'text-blue-600 dark:text-blue-400'
  if (score >= 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function barColor(score: number | null): string {
  if (score === null) return 'bg-gray-200 dark:bg-gray-700'
  if (score >= 90) return 'bg-green-400 dark:bg-green-500'
  if (score >= 80) return 'bg-blue-400 dark:bg-blue-500'
  if (score >= 70) return 'bg-amber-400 dark:bg-amber-500'
  return 'bg-red-400 dark:bg-red-500'
}

function letterToGPA(letter: string | null): number | null {
  if (!letter) return null
  const map: Record<string, number> = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0,
  }
  return map[letter.toUpperCase()] ?? null
}

function typeBadgeClass(type: ReturnType<typeof getAssignmentType>) {
  if (type === 'ma') return 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60'
  if (type === 'qa') return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
  if (type === 'hw') return 'bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'
  return 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
}

function safeHref(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : null
  } catch {
    return null
  }
}

// ─── Grades tab ──────────────────────────────────────────────────────────────

function useHiddenIds(): [Set<number>, (id: number) => void, () => void] {
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setHiddenIds(new Set(JSON.parse(raw)))
    } catch {}
  }, [])

  function toggleHide(id: number) {
    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem(LS_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function showAll() {
    setHiddenIds(new Set())
    try { localStorage.removeItem(LS_KEY) } catch {}
  }

  return [hiddenIds, toggleHide, showAll]
}

function GradeCourseRow({ grade }: { grade: CourseGrade }) {
  const [open, setOpen] = useState(false)
  const color = courseColor(grade.courseCode)
  // Fire-and-forget — already-cached promises are no-ops.
  const prefetch = () => { void prefetchBreakdown(grade).catch(() => {}) }
  return (
    <div className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 relative">
      <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-sm ${color.dot}`} aria-hidden />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        onTouchStart={prefetch}
        className="w-full px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-light text-gray-900 dark:text-gray-100 leading-snug truncate">{grade.courseName}</p>
            <p className={`text-[11px] mt-0.5 ${color.text}`}>{grade.courseCode}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <div className="text-right">
              {grade.currentGrade ? (
                <p className={`text-2xl font-light leading-none ${gradeColor(grade.currentScore)}`}>
                  {grade.currentGrade}
                </p>
              ) : (
                <p className="text-2xl font-light leading-none text-gray-300 dark:text-gray-700">—</p>
              )}
              {grade.currentScore !== null && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{grade.currentScore.toFixed(1)}%</p>
              )}
            </div>
            <span
              aria-hidden
              className={`text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </div>
        </div>
        <div className="h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all ${barColor(grade.currentScore)}`}
            style={{ width: `${grade.currentScore !== null ? Math.min(100, Math.max(0, grade.currentScore)) : 0}%` }}
          />
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 bg-gray-50/60 dark:bg-gray-900/40">
          <GradeCalculator course={grade} />
        </div>
      )}
    </div>
  )
}

function GradesTab({ grades, hiddenIds }: { grades: CourseGrade[]; hiddenIds: Set<number> }) {
  // After paint, quietly prefetch every visible course's breakdown so any click
  // lands instantly. requestIdleCallback when available keeps us out of the way
  // of higher-priority work; falls back to a short setTimeout otherwise.
  useEffect(() => {
    const visibleCourses = grades.filter((g) => !hiddenIds.has(g.courseId))
    type IdleHandle = number
    let handle: IdleHandle | null = null
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => IdleHandle
      cancelIdleCallback?: (id: IdleHandle) => void
    }
    const run = () => {
      for (const c of visibleCourses) {
        void prefetchBreakdown(c).catch(() => {})
      }
    }
    if (typeof win.requestIdleCallback === 'function') {
      handle = win.requestIdleCallback(run, { timeout: 1500 })
    } else {
      handle = window.setTimeout(run, 200)
    }
    return () => {
      if (handle === null) return
      if (typeof win.cancelIdleCallback === 'function') win.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
  }, [grades, hiddenIds])

  const visible = grades.filter((g) => !hiddenIds.has(g.courseId))
  const sorted = [...visible].sort((a, b) => {
    if (a.currentScore !== null && b.currentScore !== null) return b.currentScore - a.currentScore
    if (a.currentScore !== null) return -1
    if (b.currentScore !== null) return 1
    return a.courseName.localeCompare(b.courseName)
  })

  const gpaValues = visible.map((g) => letterToGPA(g.currentGrade)).filter((v): v is number => v !== null)
  const gpa = gpaValues.length > 0 ? gpaValues.reduce((a, b) => a + b, 0) / gpaValues.length : null

  return (
    <>
      {gpa !== null && (
        <div className="flex items-center gap-4 mb-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-4">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">Unweighted GPA</p>
            <p className={`text-3xl font-light leading-none ${gradeColor(gpa * 25)}`}>
              {gpa.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
        {visible.length} course{visible.length !== 1 ? 's' : ''}
        {hiddenIds.size > 0 && (
          <span className="ml-2 text-gray-400 dark:text-gray-500">· {hiddenIds.size} hidden (Selection)</span>
        )}
      </p>

      <div className="flex flex-col gap-2">
        {sorted.map((grade) => (
          <GradeCourseRow key={grade.courseId} grade={grade} />
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">All courses hidden.</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Use the Selection tab to show them again.</p>
        </div>
      )}

      <p className="mt-5 text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
        Click a course to test how different scores would change your grade. GPA is calculated as an
        unweighted average of current letter grades. Your information is stored on your computer and is
        not accessible to me or anyone else.
      </p>
    </>
  )
}

// ─── Selection tab ───────────────────────────────────────────────────────────

function SelectionTab({
  grades,
  hiddenIds,
  toggleHide,
  showAll,
}: {
  grades: CourseGrade[]
  hiddenIds: Set<number>
  toggleHide: (id: number) => void
  showAll: () => void
}) {
  const sorted = [...grades].sort((a, b) => a.courseName.localeCompare(b.courseName))

  if (grades.length === 0) {
    return (
      <div className="border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No courses available.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Choose which courses appear in Grades. {grades.length - hiddenIds.size} of {grades.length} shown.
        </p>
        {hiddenIds.size > 0 && (
          <button
            onClick={showAll}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Show all
          </button>
        )}
      </div>
      {sorted.map((grade) => {
        const color = courseColor(grade.courseCode)
        const hidden = hiddenIds.has(grade.courseId)
        return (
          <button
            key={grade.courseId}
            onClick={() => toggleHide(grade.courseId)}
            className={`border bg-white dark:bg-gray-950 px-5 py-3 text-left transition-colors relative ${
              hidden
                ? 'border-gray-200 dark:border-gray-800 opacity-50 hover:opacity-100'
                : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
            }`}
            aria-pressed={!hidden}
          >
            <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-sm ${color.dot}`} aria-hidden />
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-light leading-snug truncate ${hidden ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                  {grade.courseName}
                </p>
                <p className={`text-[11px] mt-0.5 ${color.text}`}>{grade.courseCode}</p>
              </div>
              <span
                className={`shrink-0 text-[11px] px-2 py-1 border transition-colors ${
                  hidden
                    ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                    : 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
                }`}
              >
                {hidden ? 'Hidden' : 'Shown'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Updates tab (with feedback + rubrics) ───────────────────────────────────

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

function fmtCommentDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function UpdateRow({ item }: { item: GradedSubmission }) {
  const [open, setOpen] = useState(false)
  const type = getAssignmentType(item.assignmentName)
  const hasScore = item.score !== null
  const hasPts = item.pointsPossible !== null && item.pointsPossible > 0
  const pct = hasScore && hasPts
    ? Math.round((item.score! / item.pointsPossible!) * 100)
    : null
  const hasExtras = item.comments.length > 0 || item.rubric.length > 0
  const link = safeHref(item.htmlUrl)

  return (
    <div className="bg-white dark:bg-gray-950">
      <button
        type="button"
        onClick={() => hasExtras && setOpen((v) => !v)}
        disabled={!hasExtras}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          hasExtras
            ? 'hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer'
            : 'cursor-default'
        }`}
        aria-expanded={hasExtras ? open : undefined}
      >
        {type !== 'other' && (
          <span className={`shrink-0 px-1.5 py-0.5 text-[10px] rounded-sm leading-none ${typeBadgeClass(type)}`}>
            {type.toUpperCase()}
          </span>
        )}
        <span className="flex-1 text-sm font-light text-gray-800 dark:text-gray-200 truncate min-w-0">
          {item.assignmentName}
        </span>
        <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 hidden sm:inline">
          {item.courseCode}
        </span>
        <div className="shrink-0 text-right">
          {hasScore && hasPts ? (
            <>
              <p className="text-sm font-light text-gray-900 dark:text-gray-100 leading-none">
                {item.score! % 1 === 0 ? item.score : item.score!.toFixed(1)}
                <span className="text-gray-400 dark:text-gray-500 text-xs"> / {item.pointsPossible} pts</span>
              </p>
              {pct !== null && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{pct}%</p>
              )}
            </>
          ) : hasScore ? (
            <p className="text-sm font-light text-gray-900 dark:text-gray-100">{item.score} pts</p>
          ) : item.grade ? (
            <p className="text-sm font-light text-gray-900 dark:text-gray-100">{item.grade}</p>
          ) : null}
        </div>
        {hasExtras && (
          <span
            aria-hidden
            className={`shrink-0 text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        )}
      </button>

      {open && hasExtras && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50/60 dark:bg-gray-900/40 flex flex-col gap-3">
          {/* Feedback */}
          {item.comments.length > 0 && (
            <section>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                Feedback
              </p>
              <ul className="flex flex-col gap-2">
                {item.comments.map((c) => (
                  <li
                    key={c.id}
                    className="border-l-2 border-gray-200 dark:border-gray-700 pl-3 text-sm font-light text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">{c.author}</span>
                      {c.createdAt && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{fmtCommentDate(c.createdAt)}</span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{c.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Rubric */}
          {item.rubric.length > 0 && (
            <section>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                Rubric
              </p>
              <ul className="flex flex-col gap-1.5">
                {item.rubric.map((r) => (
                  <li
                    key={r.id}
                    className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-light text-gray-800 dark:text-gray-200 leading-snug">
                          {r.description ?? 'Criterion'}
                        </p>
                        {r.ratingDescription && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                            {r.ratingDescription}
                          </p>
                        )}
                      </div>
                      {(r.points !== null || r.maxPoints !== null) && (
                        <p className="shrink-0 text-xs font-light text-gray-700 dark:text-gray-300 leading-none mt-0.5">
                          {r.points ?? '—'}
                          {r.maxPoints !== null && (
                            <span className="text-gray-400 dark:text-gray-500"> / {r.maxPoints}</span>
                          )}
                        </p>
                      )}
                    </div>
                    {r.comment && (
                      <p className="mt-1.5 text-[11px] text-gray-600 dark:text-gray-400 italic leading-snug">
                        “{r.comment}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline underline-offset-2 transition-colors"
            >
              Open in Canvas →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function UpdatesTab({ recentGrades }: { recentGrades: GradedSubmission[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, GradedSubmission[]>()
    for (const g of recentGrades) {
      const d = new Date(g.gradedAt)
      d.setHours(0, 0, 0, 0)
      const key = toDateStr(d)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(g)
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const todayStr = toDateStr(today)
    const yestStr = toDateStr(yesterday)

    return [...map.entries()].map(([key, items]) => {
      const isToday = key === todayStr
      const isYest = key === yestStr
      const date = parseDateStr(key)
      const label = isToday ? 'Today'
        : isYest ? 'Yesterday'
        : date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      return { key, label, items }
    })
  }, [recentGrades])

  if (recentGrades.length === 0) {
    return (
      <div className="border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No recently graded assignments.</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Check back after your teachers post scores.</p>
      </div>
    )
  }

  const withFeedback = recentGrades.reduce((n, g) => n + (g.comments.length > 0 ? 1 : 0), 0)
  const withRubric = recentGrades.reduce((n, g) => n + (g.rubric.length > 0 ? 1 : 0), 0)

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
        {recentGrades.length} graded
        {withFeedback > 0 && <span className="ml-2">· {withFeedback} with feedback</span>}
        {withRubric > 0 && <span className="ml-2">· {withRubric} with rubric</span>}
      </p>
      {groups.map((group) => (
        <div key={group.key}>
          <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-1.5 mt-4 first:mt-0">
            {group.label}
          </p>
          <div className="border border-gray-200 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
            {group.items.map((item) => (
              <UpdateRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── What-If tab ─────────────────────────────────────────────────────────────
// The grade math (groupPercent, projectedTotal) lives in lib/grade-target.ts so
// the calculator and the sample generator share one source of truth.

// Module-scoped caches survive component unmount, so collapsing and reopening a
// course dropdown is free — and so are repeat opens after the eager prefetch on
// page mount. Promises are stored (not values) so concurrent callers dedupe.
const breakdownCache = new Map<number, Promise<CourseGradeBreakdown | null>>()
const overridesCache = new Map<number, Record<number, number | null>>()
// Which assignment ids in a course got their score from "Generate Sample" (vs.
// hand-typed). Kept alongside overridesCache so reopening a course still shows
// the purple styling.
const generatedCache = new Map<number, Set<number>>()

function prefetchBreakdown(course: CourseGrade): Promise<CourseGradeBreakdown | null> {
  const existing = breakdownCache.get(course.courseId)
  if (existing) return existing
  const params = new URLSearchParams({
    courseId: String(course.courseId),
    useWeights: course.useWeights ? '1' : '0',
  })
  const promise = fetch(`/api/grade-breakdown?${params}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load (${res.status})`)
      return res.json() as Promise<CourseGradeBreakdown>
    })
    .catch((e) => {
      // Drop the failed promise so a retry can fire fresh next time.
      breakdownCache.delete(course.courseId)
      throw e
    })
  breakdownCache.set(course.courseId, promise)
  return promise
}

function parseScoreInput(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return 'invalid'
  return n
}

function ScoreInput({
  assignmentId,
  pointsPossible,
  originalScore,
  override,
  generated,
  onChange,
}: {
  assignmentId: number
  pointsPossible: number
  originalScore: number | null
  override: number | null | undefined
  // True when this value came from "Generate Sample" rather than being typed.
  generated: boolean
  onChange: (id: number, value: number | null | undefined) => void
}) {
  const display =
    override !== undefined
      ? override === null ? '' : String(override)
      : originalScore !== null ? String(originalScore) : ''
  const edited = override !== undefined
  // Purple = auto-generated, amber = hand-edited, gray = untouched.
  const inputColor = generated
    ? 'border-purple-400 dark:border-purple-500 text-purple-600 dark:text-purple-400'
    : edited
      ? 'border-amber-400 dark:border-amber-500 text-gray-900 dark:text-gray-100'
      : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          const parsed = parseScoreInput(e.target.value)
          if (parsed === 'invalid') return
          onChange(assignmentId, parsed)
        }}
        placeholder="—"
        className={`w-14 border bg-white dark:bg-gray-900 px-2 py-1 text-xs font-light text-right focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 ${inputColor}`}
      />
      <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">/ {pointsPossible}</span>
    </div>
  )
}

function GradeCalculator({ course }: { course: CourseGrade }) {
  const [breakdown, setBreakdown] = useState<CourseGradeBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<number, number | null>>(
    () => overridesCache.get(course.courseId) ?? {},
  )
  const [generatedIds, setGeneratedIds] = useState<Set<number>>(
    () => generatedCache.get(course.courseId) ?? new Set(),
  )
  const [sampleError, setSampleError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    // Skip the loading flash if the prefetch already populated the cache.
    setLoading(!breakdownCache.has(course.courseId))
    prefetchBreakdown(course)
      .then((data) => {
        if (cancelled) return
        setBreakdown(data)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [course])

  const sortedGroups = useMemo(() => {
    if (!breakdown) return []
    return [...breakdown.groups].sort((a, b) => b.weight - a.weight)
  }, [breakdown])

  const totalWeight = useMemo(() => {
    if (!breakdown) return 0
    return breakdown.groups.reduce((sum, g) => sum + g.weight, 0)
  }, [breakdown])

  const projected = breakdown ? projectedTotal(breakdown, overrides) : null
  const original = course.currentScore
  const delta = projected !== null && original !== null ? projected - original : null
  const edited = Object.keys(overrides).length > 0
  const hasDropRules = breakdown?.groups.some((g) => g.dropLowest > 0 || g.dropHighest > 0) ?? false

  function setOverride(id: number, value: number | null | undefined) {
    setOverrides((prev) => {
      const next = { ...prev }
      if (value === undefined) delete next[id]
      else next[id] = value
      if (Object.keys(next).length === 0) overridesCache.delete(course.courseId)
      else overridesCache.set(course.courseId, next)
      return next
    })
    // Hand-editing a field means it's no longer an auto-generated value.
    setGeneratedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      if (next.size === 0) generatedCache.delete(course.courseId)
      else generatedCache.set(course.courseId, next)
      return next
    })
  }

  function resetOverrides() {
    setOverrides({})
    overridesCache.delete(course.courseId)
    setGeneratedIds(new Set())
    generatedCache.delete(course.courseId)
    setSampleError(null)
  }

  // Fill every ungraded assignment with a random score that lands the course
  // at the A cutoff, or surface why that isn't possible.
  function handleGenerateSample() {
    if (!breakdown) return
    const result = generateSampleScores(breakdown, A_CUTOFF)
    if (!result.ok) {
      setSampleError(
        result.reason === 'impossible'
          ? `Can't reach ${A_CUTOFF}% — even full marks on everything left isn't enough.`
          : 'No ungraded assignments to generate scores for.',
      )
      return
    }
    setSampleError(null)
    const next: Record<number, number | null> = {}
    for (const [id, score] of result.scores) next[id] = score
    setOverrides(next)
    overridesCache.set(course.courseId, next)
    const ids = new Set(result.scores.keys())
    setGeneratedIds(ids)
    generatedCache.set(course.courseId, ids)
  }

  if (loading) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 py-8 text-center">Loading…</p>
  }
  if (error) {
    return <p className="text-xs text-red-500 py-8 text-center">{error}</p>
  }
  if (!breakdown || breakdown.groups.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 py-8 text-center">No grade categories yet.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Totals header */}
      <div className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">
            {edited ? 'What-If' : 'Projected'} total
          </p>
          <p className={`text-3xl font-light leading-none ${gradeColor(projected)}`}>
            {projected !== null ? `${projected.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={handleGenerateSample}
            className="text-[11px] px-2.5 py-1.5 border border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors whitespace-nowrap"
          >
            Generate Sample
          </button>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">Original</p>
            <p className="text-base font-light text-gray-500 dark:text-gray-400 leading-none">
              {original !== null ? `${original.toFixed(1)}%` : '—'}
            </p>
            {delta !== null && Math.abs(delta) >= 0.05 && (
              <p className={`text-[11px] mt-1 ${delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)}
              </p>
            )}
          </div>
        </div>
      </div>

      {sampleError && (
        <p className="text-[11px] text-red-600 dark:text-red-400 -mt-2">{sampleError}</p>
      )}

      {edited && (
        <button
          onClick={resetOverrides}
          className="self-start text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          ← Reset to original scores
        </button>
      )}

      {/* Groups, sorted by weight desc */}
      <div className="flex flex-col gap-4">
        {sortedGroups.map((g) => {
          const { pct, counted } = groupPercent(g, overrides)
          const weightPct = breakdown.useWeights && totalWeight > 0
            ? (g.weight / totalWeight) * 100
            : null
          return (
            <section key={g.id} className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <header className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-baseline justify-between gap-3">
                <div className="min-w-0 flex items-baseline gap-2">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{g.name}</p>
                  {weightPct !== null && weightPct > 0 ? (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                      {weightPct.toFixed(0)}% of total
                    </p>
                  ) : breakdown.useWeights ? (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">Unweighted</p>
                  ) : null}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                  {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                  <span className="text-gray-400 dark:text-gray-500 ml-1.5">
                    · {counted}/{g.assignments.length}
                  </span>
                </p>
              </header>

              {g.assignments.length === 0 ? (
                <p className="px-4 py-3 text-[11px] text-gray-400 dark:text-gray-500">No assignments yet.</p>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-900">
                  {g.assignments.map((a) => (
                    <li key={a.id} className="px-4 py-2 flex items-center gap-3">
                      <span className="flex-1 text-xs font-light text-gray-700 dark:text-gray-300 truncate">
                        {a.name}
                      </span>
                      {a.score === null && (
                        <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500 italic">
                          ungraded
                        </span>
                      )}
                      <ScoreInput
                        assignmentId={a.id}
                        pointsPossible={a.pointsPossible}
                        originalScore={a.score}
                        override={overrides[a.id]}
                        generated={generatedIds.has(a.id)}
                        onChange={setOverride}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {(g.dropLowest > 0 || g.dropHighest > 0) && (
                <p className="px-4 py-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-amber-600 dark:text-amber-400">
                  Canvas drops {g.dropLowest > 0 ? `${g.dropLowest} lowest` : ''}
                  {g.dropLowest > 0 && g.dropHighest > 0 ? ' & ' : ''}
                  {g.dropHighest > 0 ? `${g.dropHighest} highest` : ''} in this group — not modeled below.
                </p>
              )}
            </section>
          )
        })}
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
        Type a new score to see how it would change your grade. Clear a field to count an assignment as
        ungraded. Calculations match Canvas&apos; standard formula
        {breakdown.useWeights ? ' (weighted by category)' : ' (total points)'}
        {hasDropRules ? ', but drop-lowest/highest rules are noted, not applied' : ''}.
      </p>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function GradesView({
  grades,
  recentGrades,
}: {
  grades: CourseGrade[]
  recentGrades: GradedSubmission[]
}) {
  const [activeTab, setActiveTab] = useState<'grades' | 'updates' | 'selection'>('grades')
  const [hiddenIds, toggleHide, showAll] = useHiddenIds()

  const tabs = [
    { id: 'grades' as const, label: 'Grades' },
    { id: 'updates' as const, label: 'Updates' },
    { id: 'selection' as const, label: 'Selection' },
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

      {activeTab === 'grades' && <GradesTab grades={grades} hiddenIds={hiddenIds} />}
      {activeTab === 'updates' && <UpdatesTab recentGrades={recentGrades} />}
      {activeTab === 'selection' && (
        <SelectionTab grades={grades} hiddenIds={hiddenIds} toggleHide={toggleHide} showAll={showAll} />
      )}
    </>
  )
}
