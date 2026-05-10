'use client'

import { useState, useRef } from 'react'
import type { CanvasAssignment } from '@/lib/canvas-shared'

interface Props {
  assignment: CanvasAssignment
  onClose: () => void
}

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

export default function SubmitModal({ assignment, onClose }: Props) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">{assignment.courseCode}</p>
            <h2 className="text-sm font-light text-gray-900 dark:text-gray-100 leading-snug">{assignment.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 mt-0.5 text-xs text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-light text-gray-900 dark:text-gray-100">Submitted</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Your work has been sent to Canvas.</p>
            <button
              onClick={onClose}
              className="mt-5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 underline transition-colors"
            >
              Close
            </button>
          </div>
        ) : !canSubmit ? (
          <div className="px-4 py-6 flex flex-col gap-3">
            <p className="text-sm font-light text-gray-500 dark:text-gray-400">
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
            <a
              href={safeHref(assignment.html_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 underline transition-colors"
            >
              Open in Canvas →
            </a>
          </div>
        ) : (
          <div className="px-4 py-4 flex flex-col gap-3">
            {/* Type tabs */}
            {submittable.length > 1 && (
              <div className="flex gap-1.5">
                {submittable.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-3 py-1 text-[11px] border transition-colors ${
                      type === t
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                        : 'border-gray-200 text-gray-500 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
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
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm font-light text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 resize-none"
              />
            )}

            {type === 'online_url' && (
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm font-light text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500"
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
                  className="w-full border border-dashed border-gray-300 dark:border-gray-700 py-6 text-sm font-light text-center transition-colors hover:border-gray-500 dark:hover:border-gray-500"
                >
                  <span className={file ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
                    {file ? file.name : 'Click to choose a file'}
                  </span>
                </button>
              </>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex items-center justify-between gap-3">
              <a
                href={safeHref(assignment.html_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 underline transition-colors"
              >
                View in Canvas
              </a>
              <button
                onClick={submit}
                disabled={loading}
                className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-light px-5 py-2.5 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting…' : 'Submit to Canvas'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
