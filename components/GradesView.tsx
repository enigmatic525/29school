'use client'

import { useState, useEffect, useMemo } from 'react'
import type { CourseGrade, GradedSubmission } from '@/lib/canvas-shared'
import { getAssignmentType } from '@/lib/canvas-shared'
import { courseColor } from '@/lib/course-colors'

const LS_KEY = '29-hidden-grades'

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

function GradesTab({ grades }: { grades: CourseGrade[] }) {
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())
  const [editMode, setEditMode] = useState(false)

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

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {visible.length} course{visible.length !== 1 ? 's' : ''}
          {hiddenIds.size > 0 && (
            <button onClick={showAll} className="ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              · show {hiddenIds.size} hidden
            </button>
          )}
        </p>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((grade) => {
          const color = courseColor(grade.courseCode)
          return (
          <div key={grade.courseId} className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-4 relative">
            <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-sm ${color.dot}`} aria-hidden />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-light text-gray-900 dark:text-gray-100 leading-snug truncate">{grade.courseName}</p>
                <p className={`text-[11px] mt-0.5 ${color.text}`}>{grade.courseCode}</p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
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
                {editMode && (
                  <button
                    onClick={() => toggleHide(grade.courseId)}
                    className="text-[11px] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 px-2 py-1 hover:border-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:border-red-900 dark:hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all ${barColor(grade.currentScore)}`}
                style={{ width: `${grade.currentScore !== null ? Math.min(100, Math.max(0, grade.currentScore)) : 0}%` }}
              />
            </div>
          </div>
          )
        })}
      </div>

      {sorted.length === 0 && (
        <div className="border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">All courses hidden.</p>
          <button onClick={showAll} className="mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Show all →
          </button>
        </div>
      )}

      <p className="mt-5 text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
        GPA is calculated as an unweighted average of current letter grades. Grades shown are current
        grades from Canvas and may not reflect recent submissions.{' '}
        Your information is stored on your computer and is not accessible to me or anyone else.
      </p>
    </>
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

// ─── Main ────────────────────────────────────────────────────────────────────

export default function GradesView({
  grades,
  recentGrades,
}: {
  grades: CourseGrade[]
  recentGrades: GradedSubmission[]
}) {
  const [activeTab, setActiveTab] = useState<'grades' | 'updates'>('grades')

  const tabs = [
    { id: 'grades' as const, label: 'Grades' },
    { id: 'updates' as const, label: 'Updates' },
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

      {activeTab === 'grades' && <GradesTab grades={grades} />}
      {activeTab === 'updates' && <UpdatesTab recentGrades={recentGrades} />}
    </>
  )
}
