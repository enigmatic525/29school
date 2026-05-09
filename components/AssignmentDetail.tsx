'use client'

import { useState, useRef } from 'react'
import type { CanvasAssignment } from '@/lib/canvas'

const SUBMITTABLE = ['online_upload', 'online_text_entry', 'online_url'] as const
type SubmittableType = typeof SUBMITTABLE[number]

function typeLabel(t: SubmittableType) {
  if (t === 'online_upload') return 'File'
  if (t === 'online_text_entry') return 'Text'
  return 'URL'
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

interface Props {
  assignment: CanvasAssignment
  plannedDate?: string
  onMove: () => void
  onClose: () => void
}

export default function AssignmentDetail({ assignment, plannedDate, onMove, onClose }: Props) {
  const actual = new Date(assignment.due_at!)
  const planned = plannedDate ? new Date(plannedDate + 'T12:00:00') : null
  const isShifted = planned && planned.getTime() !== actual.setHours(0, 0, 0, 0)

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const submittable = assignment.submission_types.filter((t): t is SubmittableType =>
    (SUBMITTABLE as readonly string[]).includes(t)
  )
  const canSubmit = submittable.length > 0 && !assignment.is_quiz_assignment

  const [type, setType] = useState<SubmittableType>(submittable[0])
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      let res: Response
      if (type === 'online_upload') {
        if (!file) { setError('Choose a file first'); setLoading(false); return }
        const fd = new FormData()
        fd.append('courseId', String(assignment.course_id))
        fd.append('assignmentId', String(assignment.id))
        fd.append('file', file)
        res = await fetch('/api/submit', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: assignment.course_id,
            assignmentId: assignment.id,
            submissionType: type,
            ...(type === 'online_url' ? { url } : { text }),
          }),
        })
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Submission failed (${res.status})`)
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white border border-gray-200 shadow-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 mb-1">{assignment.courseCode}</p>
            <h2 className="text-base font-light text-gray-900 leading-snug">{assignment.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 mt-0.5 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Due date */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0 flex items-center gap-4 text-xs text-gray-500">
          {planned && isShifted ? (
            <>
              <span>
                <span className="text-gray-400 mr-1">Planned</span>
                {fmtDate(planned)}
              </span>
              <span className="text-gray-300">·</span>
              <span>
                <span className="text-gray-400 mr-1">Due</span>
                {fmtDate(new Date(assignment.due_at!))}
              </span>
            </>
          ) : (
            <span>
              <span className="text-gray-400 mr-1">Due</span>
              {fmtDate(new Date(assignment.due_at!))}
            </span>
          )}
          {assignment.points_possible > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span>{assignment.points_possible} pts</span>
            </>
          )}
        </div>

        {/* Scrollable body: description + submission */}
        <div className="flex-1 overflow-y-auto">
          {/* Description */}
          <div className="px-5 py-4 border-b border-gray-100">
            {assignment.description ? (
              // Content is teacher-authored HTML from the school's Canvas instance.
              <div
                className="prose-assignment text-sm font-light text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: assignment.description }}
              />
            ) : (
              <p className="text-sm text-gray-400 italic">No description provided.</p>
            )}
          </div>

          {/* Submission */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-3">Submit</p>

            {done ? (
              <p className="text-sm font-light text-gray-500">
                Submitted — your work has been sent to Canvas.
              </p>
            ) : !canSubmit ? (
              <p className="text-sm font-light text-gray-500">
                {assignment.is_quiz_assignment
                  ? 'Quizzes must be taken directly on Canvas.'
                  : assignment.submission_types.includes('none') || assignment.submission_types.length === 0
                  ? 'No submission required — just complete the work.'
                  : assignment.submission_types.includes('on_paper')
                  ? 'This assignment is submitted on paper.'
                  : assignment.submission_types.includes('discussion_topic')
                  ? 'Respond to this discussion directly on Canvas.'
                  : 'Open Canvas to submit this assignment type.'}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {submittable.length > 1 && (
                  <div className="flex gap-1.5">
                    {submittable.map((t) => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`px-3 py-1 text-[11px] border transition-colors ${
                          type === t
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {typeLabel(t)}
                      </button>
                    ))}
                  </div>
                )}

                {type === 'online_text_entry' && (
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write your answer…"
                    rows={5}
                    className="w-full border border-gray-200 p-3 text-sm font-light text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-500 resize-none"
                  />
                )}

                {type === 'online_url' && (
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full border border-gray-200 p-3 text-sm font-light text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-500"
                  />
                )}

                {type === 'online_upload' && (
                  <>
                    <input
                      ref={fileInput}
                      type="file"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      onClick={() => fileInput.current?.click()}
                      className="w-full border border-dashed border-gray-300 py-6 text-sm font-light text-center transition-colors hover:border-gray-500"
                    >
                      <span className={file ? 'text-gray-900' : 'text-gray-400'}>
                        {file ? file.name : 'Click to choose a file'}
                      </span>
                    </button>
                  </>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  onClick={submit}
                  disabled={loading}
                  className="self-end bg-gray-900 text-white text-xs font-light px-5 py-2.5 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting…' : 'Submit to Canvas'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3 shrink-0 flex items-center justify-between gap-3">
          <a
            href={safeHref(assignment.html_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
          >
            Open in Canvas
          </a>
          <button
            onClick={onMove}
            className="border border-gray-200 px-4 py-2 text-xs font-light text-gray-700 hover:border-gray-400 transition-colors"
          >
            Move date
          </button>
        </div>
      </div>
    </div>
  )
}
