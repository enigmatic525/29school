'use client'

import { useState, useMemo } from 'react'
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

export default function CalendarHeatmap({ assignments }: Props) {
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | null>(null)

  const weeks = useMemo((): Week[] => {
    const today = new Date()
    const start = mondayOf(today)
    const result: Week[] = []
    let cur = new Date(start)
    for (let i = 0; i < 16; i++) {
      const weekEnd = addDays(cur, 6)
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

  const displayed = useMemo(() => {
    const week = selectedWeekIdx !== null ? weeks[selectedWeekIdx] : null
    if (!week) return []
    return [...week.assignments].sort(
      (a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()
    )
  }, [weeks, selectedWeekIdx])

  return (
    <div className="flex flex-col gap-6">
      {/* Heatmap grid */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {weeks.map((week, i) => {
          const isRed = week.score >= 30
          const isSelected = selectedWeekIdx === i
          return (
            <button
              key={i}
              onClick={() => setSelectedWeekIdx(isSelected ? null : i)}
              className={`flex flex-col gap-1 border p-2 text-left transition-all ${
                isRed
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
              } ${isSelected ? 'ring-2 ring-gray-900 ring-offset-1' : ''}`}
            >
              <span className="text-[9px] leading-tight text-gray-400 break-words">
                {fmt(week.start)}–{fmt(week.end)}
              </span>
              <span className={`text-lg font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
                {week.score}
              </span>
            </button>
          )
        })}
      </div>

      {/* Scoring legend */}
      <div className="flex gap-5 text-xs text-gray-400 uppercase tracking-wide">
        <span>CW: 0</span>
        <span>HW: 1</span>
        <span>QA: 5</span>
        <span>MA: 10</span>
      </div>

      {/* Assignment list for selected week */}
      {selectedWeekIdx !== null && (
        <div className="flex flex-col gap-3 border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900">
              {weeks[selectedWeekIdx].label}
            </h2>
            <span className="text-xs text-gray-400">
              score {weeks[selectedWeekIdx].score} · {displayed.length} item{displayed.length !== 1 ? 's' : ''}
            </span>
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
                      className={`mt-0.5 shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                        type === 'ma'
                          ? 'bg-red-100 text-red-600'
                          : type === 'qa'
                          ? 'bg-amber-100 text-amber-700'
                          : type === 'hw'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {type === 'other' ? '–' : type.toUpperCase()}
                    </span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <a
                        href={a.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm text-gray-800 hover:text-black hover:underline"
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
