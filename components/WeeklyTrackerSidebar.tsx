'use client'

import { useState, useEffect } from 'react'
import { courseColor } from '@/lib/course-colors'
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

// ─── Pop-out sidebar ──────────────────────────────────────────────────────────

export default function WeeklyTrackerSidebar({ weekStats }: { weekStats: WeekStats }) {
  const [ready, setReady] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setEnabled(loadWeeklyTrackerEnabled())
    try {
      setOpen(localStorage.getItem('29-weekly-tracker-open') === '1')
    } catch {}
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem('29-weekly-tracker-open', open ? '1' : '0') } catch {}
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
      </div>
    </aside>
  )
}
