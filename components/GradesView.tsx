'use client'

import { useState, useEffect } from 'react'
import type { CourseGrade } from '@/lib/canvas'

const LS_KEY = '29-hidden-grades'

function gradeColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 90) return 'text-green-600'
  if (score >= 80) return 'text-blue-600'
  if (score >= 70) return 'text-amber-600'
  return 'text-red-600'
}

function barColor(score: number | null): string {
  if (score === null) return 'bg-gray-200'
  if (score >= 90) return 'bg-green-400'
  if (score >= 80) return 'bg-blue-400'
  if (score >= 70) return 'bg-amber-400'
  return 'bg-red-400'
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

export default function GradesView({ grades }: { grades: CourseGrade[] }) {
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
      {/* GPA summary */}
      {gpa !== null && (
        <div className="flex items-center gap-4 mb-6 border border-gray-200 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Unweighted GPA</p>
            <p className={`text-3xl font-light leading-none ${gradeColor(gpa * 25)}`}>
              {gpa.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400">
          {visible.length} course{visible.length !== 1 ? 's' : ''}
          {hiddenIds.size > 0 && (
            <button onClick={showAll} className="ml-2 text-gray-400 hover:text-gray-700 transition-colors">
              · show {hiddenIds.size} hidden
            </button>
          )}
        </p>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Course cards */}
      <div className="flex flex-col gap-2">
        {sorted.map((grade) => (
          <div key={grade.courseId} className="border border-gray-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-light text-gray-900 leading-snug truncate">{grade.courseName}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{grade.courseCode}</p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <div className="text-right">
                  {grade.currentGrade ? (
                    <p className={`text-2xl font-light leading-none ${gradeColor(grade.currentScore)}`}>
                      {grade.currentGrade}
                    </p>
                  ) : (
                    <p className="text-2xl font-light leading-none text-gray-300">—</p>
                  )}
                  {grade.currentScore !== null && (
                    <p className="text-[11px] text-gray-400 mt-1">{grade.currentScore.toFixed(1)}%</p>
                  )}
                </div>
                {editMode && (
                  <button
                    onClick={() => toggleHide(grade.courseId)}
                    className="text-[11px] text-gray-400 border border-gray-200 px-2 py-1 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all ${barColor(grade.currentScore)}`}
                style={{ width: `${grade.currentScore !== null ? Math.min(100, Math.max(0, grade.currentScore)) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-400">All courses hidden.</p>
          <button onClick={showAll} className="mt-2 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            Show all →
          </button>
        </div>
      )}

      <p className="mt-5 text-[10px] text-gray-400 leading-relaxed">
        GPA is calculated as an unweighted average of current letter grades. Grades shown are current
        grades from Canvas and may not reflect recent submissions.{' '}
        Your information is stored on your computer and is not accessible to me or anyone else.
      </p>
    </>
  )
}
