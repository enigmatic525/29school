'use client'

import { useState, useEffect, useRef } from 'react'

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

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function StudyGuides() {
  const [groups, setGroups] = useState<ClassGroup[]>([])
  const [classes, setClasses] = useState<DBClass[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  async function load() {
    const res = await fetch('/api/study-guides')
    const data = await res.json()
    setGroups(data.groups ?? [])
    setClasses(data.classes ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Shared by the class</p>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-none bg-gray-900 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-gray-700 transition-colors"
        >
          + Add Resource
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : groups.length === 0 && classes.length === 0 ? (
        <div className="border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-400">No resources yet.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 text-xs text-gray-400 hover:text-gray-700 uppercase tracking-wide transition-colors"
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
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0">
                  {group.name}
                </h2>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <ul className="flex flex-col gap-1.5">
                {group.guides.map((guide) => (
                  <li key={guide.id}>
                    <a
                      href={guide.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors group"
                    >
                      <span className="text-gray-400 shrink-0">
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
                      <span className="shrink-0 text-[11px] text-gray-400 uppercase tracking-wide">
                        {fmt(guide.created_at)}
                      </span>
                    </a>
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
          onAdded={(newGroups, newClasses) => {
            setGroups(newGroups)
            setClasses(newClasses)
            setModalOpen(false)
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
  onAdded: (groups: ClassGroup[], classes: DBClass[]) => void
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
        if (!res.ok) { setError(data.error); setSubmitting(false); return }
        resolvedClassId = data.class.id
      }

      let finalUrl = url
      if (type === 'pdf') {
        if (!file) { setError('Please select a PDF'); setSubmitting(false); return }
        const fd = new FormData()
        fd.append('file', file)
        const uploadRes = await fetch('/api/study-guides/upload', { method: 'POST', body: fd })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) { setError(uploadData.error); setSubmitting(false); return }
        finalUrl = uploadData.url
      }

      if (!finalUrl) { setError('URL required'); setSubmitting(false); return }

      const res = await fetch('/api/study-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: resolvedClassId, title, type, url: finalUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSubmitting(false); return }

      const listRes = await fetch('/api/study-guides')
      const listData = await listRes.json()
      onAdded(listData.groups ?? [], listData.classes ?? [])
    } catch {
      setError('Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-gray-200 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900">Add Resource</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Class</label>
              <select
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
                  className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 transition-colors"
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 7 Study Guide"
                required
                className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            <div className="flex gap-2">
              {(['link', 'pdf'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setUrl(''); setFile(null) }}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
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
                className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 transition-colors"
              />
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center hover:border-gray-500 transition-colors"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <p className="text-sm text-gray-700">{file.name}</p>
                ) : (
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Click to select a PDF</p>
                )}
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="rounded-none bg-gray-900 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Uploading…' : 'Add Resource'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
