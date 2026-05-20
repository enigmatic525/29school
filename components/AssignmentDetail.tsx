'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type {
  CanvasAssignment,
  SubmissionDetail,
  SubmissionComment,
  RubricCriterionResult,
} from '@/lib/canvas-shared'
import { hasNoSubmission } from '@/lib/canvas-shared'

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

function fmtBytes(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`
}

function fmtCommentDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
      {children}
    </p>
  )
}

function CommentList({ comments }: { comments: SubmissionComment[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {comments.map((c) => (
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
  )
}

// Comment thread for one assignment: existing teacher/student comments plus a
// composer that posts the student's own comment back to Canvas.
function CommentsSection({
  courseId,
  assignmentId,
  comments,
  onPosted,
}: {
  courseId: number
  assignmentId: number
  comments: SubmissionComment[]
  onPosted: () => void
}) {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function post() {
    const trimmed = text.trim()
    if (!trimmed || posting) return
    setPosting(true)
    setError(null)
    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, assignmentId, text: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Couldn’t post comment (${res.status})`)
      }
      setText('')
      // Reload so the new comment appears in the thread above.
      onPosted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <SectionLabel>Comments</SectionLabel>
      {comments.length > 0 ? (
        <CommentList comments={comments} />
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No comments yet.</p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 text-sm font-light text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 resize-none"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={post}
          disabled={posting || text.trim() === ''}
          className="self-end bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-light px-4 py-2 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {posting ? 'Posting…' : 'Comment'}
        </button>
      </div>
    </div>
  )
}

function RubricList({ rubric }: { rubric: RubricCriterionResult[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {rubric.map((r) => (
        <li key={r.id} className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2">
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
  )
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
  // Compare calendar days. `planned` is normalised to local noon, so a raw
  // timestamp compare against the due date would read as shifted every time.
  const isShifted = !!planned && planned.toDateString() !== actual.toDateString()

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // A no-submission assignment can never be "missing" — there's nothing to miss.
  const showMissing = !!assignment.isMissing && !hasNoSubmission(assignment)

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

  const [detail, setDetail] = useState<SubmissionDetail | null>(null)
  const [detailStatus, setDetailStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, loading])

  // Pull the student's own submission + the assignment's rubric whenever the
  // modal opens. Canvas scopes this to the caller, so it's their work only.
  const loadDetail = useCallback(async () => {
    setDetailStatus('loading')
    try {
      const params = new URLSearchParams({
        courseId: String(assignment.course_id),
        assignmentId: String(assignment.id),
      })
      const res = await fetch(`/api/submission?${params}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      setDetail((await res.json()) as SubmissionDetail)
      setDetailStatus('loaded')
    } catch {
      setDetailStatus('error')
    }
  }, [assignment.course_id, assignment.id])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

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
      // Refresh so the "Your submission" section reflects the new attempt.
      void loadDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const hasSubmissionContent = !!(
    detail && (detail.submittedAt || detail.body || detail.url || detail.attachments.length > 0)
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/60 px-4 pb-4 sm:pb-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 dark:border-gray-800 px-5 py-4 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">{assignment.courseCode}</p>
            <h2 className="text-base font-light text-gray-900 dark:text-gray-100 leading-snug">{assignment.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 mt-0.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Due date */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          {planned && isShifted ? (
            <>
              <span>
                <span className="text-gray-400 dark:text-gray-500 mr-1">Planned</span>
                {fmtDate(planned)}
              </span>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <span>
                <span className="text-gray-400 dark:text-gray-500 mr-1">Due</span>
                {fmtDate(new Date(assignment.due_at!))}
              </span>
            </>
          ) : (
            <span>
              <span className="text-gray-400 dark:text-gray-500 mr-1">Due</span>
              {fmtDate(new Date(assignment.due_at!))}
            </span>
          )}
          {assignment.points_possible > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <span>
                {typeof assignment.score === 'number'
                  ? <><span className="text-emerald-700 dark:text-emerald-300">{assignment.score}</span> / {assignment.points_possible} pts</>
                  : <>{assignment.points_possible} pts</>}
              </span>
            </>
          )}
        </div>

        {/* Submission status banner */}
        {(assignment.submittedAt || assignment.isLate || showMissing) && (
          <div className={`px-5 py-2 border-b text-xs flex items-center gap-2 shrink-0 ${
            showMissing || (assignment.isLate && !assignment.submittedAt)
              ? 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/60 text-red-700 dark:text-red-300'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
          }`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {showMissing || (assignment.isLate && !assignment.submittedAt)
                ? <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
                : <polyline points="20 6 9 17 4 12" />}
            </svg>
            <span>
              {showMissing
                ? 'Missing — not yet submitted'
                : assignment.submittedAt
                ? `${assignment.submissionState === 'graded' ? 'Graded' : 'Submitted'}${assignment.isLate ? ' (late)' : ''} · ${new Date(assignment.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Marked late on Canvas'}
            </span>
          </div>
        )}

        {/* Scrollable body: description + submission */}
        <div className="flex-1 overflow-y-auto">
          {/* Description */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            {assignment.description ? (
              // Content is teacher-authored HTML from the school's Canvas instance.
              <div
                className="prose-assignment text-sm font-light text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: assignment.description }}
              />
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No description provided.</p>
            )}
          </div>

          {detailStatus === 'loading' && (
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-500">Loading submission &amp; rubric…</p>
            </div>
          )}

          {detailStatus === 'error' && (
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Couldn’t load submission details.</p>
            </div>
          )}

          {/* Your submission — full contents of what was turned in */}
          {detailStatus === 'loaded' && detail && hasSubmissionContent && (
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <SectionLabel>Your submission</SectionLabel>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2.5">
                {detail.submittedAt
                  ? `Submitted ${new Date(detail.submittedAt).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}`
                  : 'Submitted'}
                {detail.attempt !== null && detail.attempt > 1 && (
                  <span className="ml-2 text-gray-300 dark:text-gray-600">· Attempt {detail.attempt}</span>
                )}
              </p>

              {detail.body ? (
                // Sanitised server-side before it ever reaches the client.
                <div
                  className="prose-assignment text-sm font-light text-gray-700 dark:text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: detail.body }}
                />
              ) : detail.url ? (
                <a
                  href={safeHref(detail.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-light text-gray-700 dark:text-gray-300 underline underline-offset-2 break-all hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  {detail.url}
                </a>
              ) : detail.attachments.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {detail.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={safeHref(a.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 border border-gray-200 dark:border-gray-800 px-3 py-2 hover:border-gray-400 dark:hover:border-gray-600 transition-colors group"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-gray-400 dark:text-gray-500">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="flex-1 min-w-0 truncate text-sm font-light text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                          {a.displayName}
                        </span>
                        {fmtBytes(a.size) && (
                          <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500">{fmtBytes(a.size)}</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  Submitted on Canvas — open it there to view the full contents.
                </p>
              )}
            </div>
          )}

          {/* Comments — teacher feedback plus the student's own replies */}
          {detailStatus === 'loaded' && detail && (
            <CommentsSection
              courseId={assignment.course_id}
              assignmentId={assignment.id}
              comments={detail.comments}
              onPosted={loadDetail}
            />
          )}

          {/* Rubric — always shown when the assignment defines one */}
          {detailStatus === 'loaded' && detail && detail.rubric.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <SectionLabel>Rubric</SectionLabel>
              <RubricList rubric={detail.rubric} />
            </div>
          )}

          {/* Submission */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Submit</p>

            {done ? (
              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Submitted — your work has been sent to Canvas.
              </p>
            ) : !canSubmit ? (
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

                <button
                  onClick={submit}
                  disabled={loading}
                  className="self-end bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-light px-5 py-2.5 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting…' : 'Submit to Canvas'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 shrink-0 flex items-center justify-between gap-3">
          <a
            href={safeHref(assignment.html_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 underline underline-offset-2 transition-colors"
          >
            Open in Canvas
          </a>
          <button
            onClick={onMove}
            className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-xs font-light text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          >
            Move date
          </button>
        </div>
      </div>
    </div>
  )
}
