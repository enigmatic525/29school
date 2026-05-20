'use client'

import { useState, useEffect } from 'react'
import { courseColor } from '@/lib/course-colors'
import { getAssignmentType, type AssignmentType, type GradedSubmission } from '@/lib/canvas-shared'
import { loadWeeklyTrackerEnabled } from '@/lib/ui-prefs'

export interface WeekStats {
  total: number
  done: number
  segments: Array<{ code: string; count: number; done: number; color: ReturnType<typeof courseColor> }>
  rangeLabel: string
}

// ─── Completion ring ──────────────────────────────────────────────────────────

function CompletionRing({
  total,
  done,
  segments,
}: Pick<WeekStats, 'total' | 'done' | 'segments'>) {
  const size = 128
  const stroke = 13
  const cx = size / 2
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  // A small gap between course arcs so adjacent hues stay readable.
  const gap = segments.length > 1 ? 3 : 0

  let acc = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${cx} ${cx})`} fill="none" strokeWidth={stroke}>
          {total === 0 ? (
            <circle cx={cx} cy={cx} r={r} stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
          ) : (
            segments.map((seg) => {
              const segLen = (seg.count / total) * c
              const drawn = Math.max(segLen - gap, 0)
              const drawnDone = Math.min((seg.done / total) * c, drawn)
              const el = (
                <g key={seg.code} className={seg.color.text} stroke="currentColor">
                  <circle
                    cx={cx} cy={cx} r={r}
                    strokeOpacity={0.18}
                    strokeDasharray={`${drawn} ${c}`}
                    strokeDashoffset={-acc}
                  />
                  {drawnDone > 0 && (
                    <circle
                      cx={cx} cy={cx} r={r}
                      strokeDasharray={`${drawnDone} ${c}`}
                      strokeDashoffset={-acc}
                    />
                  )}
                </g>
              )
              acc += segLen
              return el
            })
          )}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-light leading-none text-gray-900 dark:text-gray-100">{pct}%</span>
        <span className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 leading-none">{done}/{total}</span>
        <span className="mt-0.5 text-[10px] text-gray-300 dark:text-gray-600 leading-none">Complete</span>
      </div>
    </div>
  )
}

// ─── Newly graded feed ────────────────────────────────────────────────────────

function typeBadgeClass(type: AssignmentType) {
  if (type === 'ma') return 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60'
  if (type === 'qa') return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
  if (type === 'hw') return 'bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'
  return 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
}

function safeHref(raw: string | null): string {
  if (!raw) return ''
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : ''
  } catch {
    return ''
  }
}

// One graded assignment in the feed. Collapsed by default; expanding reveals
// the teacher's feedback comments and the rubric breakdown.
function GradedRow({ item, isNew }: { item: GradedSubmission; isNew: boolean }) {
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
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <button
        type="button"
        onClick={() => hasExtras && setOpen((v) => !v)}
        disabled={!hasExtras}
        aria-expanded={hasExtras ? open : undefined}
        className={`w-full px-4 py-2.5 text-left transition-colors ${
          hasExtras ? 'hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {isNew && (
            <span
              className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
              aria-label="New"
            />
          )}
          {type !== 'other' && (
            <span className={`shrink-0 px-1 py-0.5 text-[9px] rounded-sm leading-none ${typeBadgeClass(type)}`}>
              {type.toUpperCase()}
            </span>
          )}
          <span className="flex-1 min-w-0 truncate text-xs font-light text-gray-800 dark:text-gray-200">
            {item.assignmentName}
          </span>
          {hasExtras && (
            <span
              aria-hidden
              className={`shrink-0 text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{item.courseCode}</span>
          <span className="ml-auto shrink-0 text-[11px] font-light text-gray-700 dark:text-gray-300 tabular-nums">
            {hasScore && hasPts ? (
              <>
                {item.score! % 1 === 0 ? item.score : item.score!.toFixed(1)}
                <span className="text-gray-400 dark:text-gray-500"> / {item.pointsPossible}</span>
              </>
            ) : hasScore ? (
              <>{item.score} pts</>
            ) : item.grade ? (
              item.grade
            ) : null}
            {pct !== null && <span className="text-gray-400 dark:text-gray-500"> · {pct}%</span>}
          </span>
        </div>
      </button>

      {open && hasExtras && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50/60 dark:bg-gray-900/40 flex flex-col gap-3">
          {item.comments.length > 0 && (
            <section>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                Feedback
              </p>
              <ul className="flex flex-col gap-2">
                {item.comments.map((c) => (
                  <li
                    key={c.id}
                    className="border-l-2 border-gray-200 dark:border-gray-700 pl-2.5 text-xs font-light text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{c.author}</span>
                    <p className="whitespace-pre-wrap leading-relaxed">{c.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {item.rubric.length > 0 && (
            <section>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                Rubric
              </p>
              <ul className="flex flex-col gap-1.5">
                {item.rubric.map((r) => (
                  <li
                    key={r.id}
                    className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-2.5 py-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-[11px] font-light text-gray-800 dark:text-gray-200 leading-snug">
                        {r.description ?? 'Criterion'}
                      </p>
                      {(r.points !== null || r.maxPoints !== null) && (
                        <p className="shrink-0 text-[11px] font-light text-gray-700 dark:text-gray-300 leading-none mt-0.5 tabular-nums">
                          {r.points ?? '—'}
                          {r.maxPoints !== null && (
                            <span className="text-gray-400 dark:text-gray-500"> / {r.maxPoints}</span>
                          )}
                        </p>
                      )}
                    </div>
                    {r.comment && (
                      <p className="mt-1 text-[10px] text-gray-600 dark:text-gray-400 italic leading-snug">
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
              className="self-start text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline underline-offset-2 transition-colors"
            >
              Open in Canvas →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Pop-out sidebar ──────────────────────────────────────────────────────────

const SEEN_GRADES_KEY = '29-seen-grades'

export default function WeeklyTrackerSidebar({
  weekStats,
  recentGrades = [],
}: {
  weekStats: WeekStats
  recentGrades?: GradedSubmission[]
}) {
  const [ready, setReady] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [open, setOpen] = useState(false)
  // Ids that were graded since the panel was last opened — drive the "new" dot
  // and the unread badge. Frozen for the session so rows stay marked after the
  // panel is opened.
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [unseen, setUnseen] = useState(0)

  useEffect(() => {
    setEnabled(loadWeeklyTrackerEnabled())
    try {
      setOpen(localStorage.getItem('29-weekly-tracker-open') === '1')
    } catch {}
    let seen: string[] = []
    try {
      const raw = localStorage.getItem(SEEN_GRADES_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) seen = parsed.map(String)
      }
    } catch {}
    const seenSet = new Set(seen)
    const fresh = recentGrades.filter((g) => !seenSet.has(String(g.id)))
    setNewIds(new Set(fresh.map((g) => String(g.id))))
    setUnseen(fresh.length)
    setReady(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem('29-weekly-tracker-open', open ? '1' : '0') } catch {}
  }, [open, ready])

  // Opening the panel marks every current grade as seen, clearing the badge.
  useEffect(() => {
    if (!ready || !open || unseen === 0) return
    try {
      localStorage.setItem(SEEN_GRADES_KEY, JSON.stringify(recentGrades.map((g) => String(g.id))))
    } catch {}
    setUnseen(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Render nothing until the prefs are read, so a disabled tracker never flashes.
  if (!ready || !enabled) return null

  return (
    <aside
      className={`fixed right-0 top-[52px] bottom-0 z-40 w-72 max-w-[85vw] border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg transition-transform duration-300 ease-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Edge toggle tab — sticks out to the left and slides with the panel */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close weekly tracker' : 'Open weekly tracker'}
        aria-expanded={open}
        className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 flex items-center justify-center w-7 h-14 rounded-l-md border border-r-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 shadow-sm transition-colors"
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden
          className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {/* Unread-grades badge — only while the panel is closed */}
        {!open && unseen > 0 && (
          <span
            aria-label={`${unseen} newly graded`}
            className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-emerald-500 dark:bg-emerald-400 text-[10px] font-medium leading-none text-white dark:text-gray-900"
          >
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
      </button>

      <div aria-hidden={!open} className="flex h-full flex-col overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <p className="text-sm font-light text-gray-900 dark:text-gray-100 leading-none">This week</p>
          <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500 leading-none">{weekStats.rangeLabel}</p>
        </div>

        <div className="flex flex-col items-center gap-5 px-4 py-6">
          <CompletionRing total={weekStats.total} done={weekStats.done} segments={weekStats.segments} />

          {weekStats.total === 0 ? (
            <p className="text-[11px] text-gray-300 dark:text-gray-600">Nothing due this week.</p>
          ) : weekStats.segments.length > 1 ? (
            <ul className="w-full flex flex-col gap-1.5">
              {weekStats.segments.map((s) => (
                <li key={s.code} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.color.dot}`} aria-hidden />
                  <span className="text-gray-500 dark:text-gray-400 truncate">{s.code}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-gray-300 dark:text-gray-600">{s.done}/{s.count}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Newly graded feed — sits below the weekly completion summary */}
        {recentGrades.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-900">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Newly graded</span>
              {newIds.size > 0 ? (
                <span className="ml-auto px-1.5 py-0.5 text-[10px] leading-none rounded-sm bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
                  {newIds.size} new
                </span>
              ) : (
                <span className="ml-auto text-[10px] text-gray-300 dark:text-gray-600">{recentGrades.length}</span>
              )}
            </div>
            <div className="bg-white dark:bg-gray-950">
              {recentGrades.map((g) => (
                <GradedRow key={g.id} item={g} isNew={newIds.has(String(g.id))} />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
