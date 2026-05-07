'use client'

import { useState, useRef } from 'react'

interface Guide {
  id: number
  class_id: number
  title: string
  type: 'pdf' | 'link'
  url: string
  created_at: string
}

interface ClassGroup {
  id: number
  name: string
  guides: Guide[]
}

interface DBClass {
  id: number
  name: string
}

interface Props {
  initialGroups: ClassGroup[]
  initialClasses: DBClass[]
  initialError: string | null
  schemaMissing?: boolean
  supabaseHost?: string
  sqlEditorUrl?: string
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Defense-in-depth: never render a stored `javascript:`/`data:` URL as an href.
function safeHref(raw: string): string {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : '#'
  } catch {
    return '#'
  }
}

export default function StudyGuides({
  initialGroups,
  initialClasses,
  initialError,
  schemaMissing,
  supabaseHost,
  sqlEditorUrl,
}: Props) {
  const [groups, setGroups] = useState<ClassGroup[]>(initialGroups)
  const [classes, setClasses] = useState<DBClass[]>(initialClasses)
  const [error, setError] = useState<string | null>(initialError)
  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function refresh() {
    try {
      const res = await fetch('/api/study-guides', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not load study guides')
        return
      }
      setError(null)
      setGroups(data.groups ?? [])
      setClasses(data.classes ?? [])
    } catch {
      setError('Could not load study guides')
    }
  }

  async function handleDelete(guideId: number) {
    setDeletingId(guideId)
    try {
      const res = await fetch(`/api/study-guides/${guideId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Could not delete')
        setDeletingId(null)
        return
      }
      setGroups((prev) =>
        prev
          .map((g) => ({ ...g, guides: g.guides.filter((guide) => guide.id !== guideId) }))
          .filter((g) => g.guides.length > 0)
      )
    } catch {
      setError('Could not delete')
    }
    setDeletingId(null)
  }

  if (schemaMissing) {
    return (
      <div className="border border-amber-200 bg-amber-50 p-6 flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-amber-900 mb-1">Database tables need to be created</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            The study guides feature stores data in Supabase, but the required tables don&apos;t exist yet
            {supabaseHost && (
              <> in your project at <code className="px-1 bg-amber-100 rounded text-[11px]">{supabaseHost}</code></>
            )}.
            Follow the steps below — it takes about two minutes.
          </p>
        </div>

        <ol className="flex flex-col gap-3 text-xs text-amber-800">
          <li className="flex gap-3">
            <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-medium text-[10px]">1</span>
            <span className="pt-0.5">
              {sqlEditorUrl ? (
                <>
                  <a
                    href={sqlEditorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline text-amber-900 hover:text-amber-700"
                  >
                    Open the Supabase SQL Editor
                  </a>
                  {' '}(this link goes directly to your project&apos;s SQL editor).
                </>
              ) : (
                <>Go to <strong>supabase.com/dashboard</strong>, select your project, then click <strong>SQL Editor</strong> in the left sidebar.</>
              )}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-medium text-[10px]">2</span>
            <span className="pt-0.5">
              In your code editor, open{' '}
              <code className="px-1 bg-amber-100 rounded text-[11px]">supabase/schema.sql</code>{' '}
              and copy its entire contents.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-medium text-[10px]">3</span>
            <span className="pt-0.5">Paste into the SQL Editor and click <strong>Run</strong> (or press <kbd className="px-1 bg-amber-100 rounded text-[11px]">⌘ Enter</kbd>). You should see a &ldquo;Success&rdquo; message.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-medium text-[10px]">4</span>
            <span className="pt-0.5">Reload this page — the study guides tab will work immediately.</span>
          </li>
        </ol>
      </div>
    )
  }

  const total = groups.reduce((n, g) => n + g.guides.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {total} resource{total === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-none bg-gray-900 px-4 py-2 text-xs font-light text-white hover:bg-gray-700 transition-colors"
        >
          + Add Resource
        </button>
      </div>

      {error ? (
        <div className="border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-400">No resources yet.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Be the first to add one →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-200" />
                <h2 className="text-xs font-light text-gray-500 shrink-0">
                  {group.name}
                </h2>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <ul className="flex flex-col gap-1.5">
                {group.guides.map((guide) => (
                  <li key={guide.id} className="flex items-stretch gap-0">
                    <a
                      href={safeHref(guide.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center gap-3 border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors group border-r-0"
                    >
                      <span className="text-gray-400 shrink-0" aria-hidden="true">
                        {guide.type === 'pdf' ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                        )}
                      </span>
                      <span className="flex-1 text-sm text-gray-800 group-hover:text-black truncate">
                        {guide.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {fmt(guide.created_at)}
                      </span>
                    </a>
                    <button
                      onClick={() => handleDelete(guide.id)}
                      disabled={deletingId === guide.id}
                      aria-label={`Delete ${guide.title}`}
                      className="flex items-center justify-center border border-gray-200 bg-white px-3 text-gray-300 hover:text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/>
                        <path d="M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {modalOpen && (
        <AddModal
          classes={classes}
          onClose={() => setModalOpen(false)}
          onAdded={async () => {
            setModalOpen(false)
            await refresh()
          }}
        />
      )}
    </div>
  )
}

function AddModal({
  classes,
  onClose,
  onAdded,
}: {
  classes: DBClass[]
  onClose: () => void
  onAdded: () => void
}) {
  const [classId, setClassId] = useState<number | 'new'>(classes[0]?.id ?? 'new')
  const [newClassName, setNewClassName] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'pdf' | 'link'>('link')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      let resolvedClassId = classId

      if (classId === 'new') {
        if (!newClassName.trim()) { setError('Class name required'); setSubmitting(false); return }
        const res = await fetch('/api/study-guides/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newClassName.trim() }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Could not save'); setSubmitting(false); return }
        resolvedClassId = data.class.id
      }

      let finalUrl = url
      if (type === 'pdf') {
        if (!file) { setError('Please select a PDF'); setSubmitting(false); return }
        const fd = new FormData()
        fd.append('file', file)
        const uploadRes = await fetch('/api/study-guides/upload', { method: 'POST', body: fd })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) { setError(uploadData.error || 'Upload failed'); setSubmitting(false); return }
        finalUrl = uploadData.url
      }

      if (!finalUrl) { setError('URL required'); setSubmitting(false); return }

      const res = await fetch('/api/study-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: resolvedClassId, title, type, url: finalUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not save'); setSubmitting(false); return }

      onAdded()
    } catch {
      setError('Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-resource-title"
      >
        <div className="w-full max-w-md border border-gray-200 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 id="add-resource-title" className="text-xs font-light text-gray-900">
              Add Resource
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="resource-class" className="text-xs font-light text-gray-500">Class</label>
              <select
                id="resource-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value === 'new' ? 'new' : Number(e.target.value))}
                className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900 transition-colors"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="new">+ New class…</option>
              </select>
              {classId === 'new' && (
                <input
                  autoFocus
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Pre-Calculus (Spring)"
                  maxLength={100}
                  className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 transition-colors"
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="resource-title" className="text-xs font-light text-gray-500">Title</label>
              <input
                id="resource-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 7 Study Guide"
                required
                maxLength={200}
                className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            <div role="tablist" aria-label="Resource type" className="flex gap-2">
              {(['link', 'pdf'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={type === t}
                  onClick={() => { setType(t); setUrl(''); setFile(null) }}
                  className={`flex-1 py-2 text-xs font-light transition-colors ${
                    type === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {t === 'link' ? 'Link' : 'PDF'}
                </button>
              ))}
            </div>

            {type === 'link' ? (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                type="url"
                required
                maxLength={2048}
                className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 transition-colors"
              />
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center hover:border-gray-500 transition-colors"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <p className="text-sm text-gray-700">{file.name}</p>
                ) : (
                  <p className="text-xs text-gray-400">Click to select a PDF (max 10 MB)</p>
                )}
              </button>
            )}

            {error && <p className="text-xs text-red-500" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="rounded-none bg-gray-900 py-2.5 text-xs font-light text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Uploading…' : 'Add Resource'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
