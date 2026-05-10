'use client'

import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface Store {
  groups: ClassGroup[]
  classes: DBClass[]
  nextId: number
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED: Store = {
  nextId: 100,
  classes: [
    { id: 1, name: 'Pre-Calculus' },
    { id: 2, name: 'AP World History' },
    { id: 3, name: 'English 10' },
    { id: 4, name: 'Biology' },
    { id: 5, name: 'Spanish 3' },
  ],
  groups: [
    {
      id: 1,
      name: 'Pre-Calculus',
      guides: [
        { id: 1, class_id: 1, title: 'Unit 3 Review — Trig Identities', type: 'link', url: 'https://www.khanacademy.org/math/precalculus', created_at: '2026-04-01T00:00:00Z' },
        { id: 2, class_id: 1, title: 'Unit 5 Practice Problems (Khan)', type: 'link', url: 'https://www.khanacademy.org/math/precalculus', created_at: '2026-04-20T00:00:00Z' },
      ],
    },
    {
      id: 2,
      name: 'AP World History',
      guides: [
        { id: 3, class_id: 2, title: 'Period 1–3 Key Terms', type: 'link', url: 'https://quizlet.com', created_at: '2026-03-20T00:00:00Z' },
        { id: 4, class_id: 2, title: 'CCOT Essay Outline Template', type: 'link', url: 'https://docs.google.com', created_at: '2026-03-28T00:00:00Z' },
      ],
    },
    {
      id: 3,
      name: 'English 10',
      guides: [
        { id: 5, class_id: 3, title: 'Of Mice and Men — Reading Notes', type: 'link', url: 'https://docs.google.com', created_at: '2026-04-10T00:00:00Z' },
      ],
    },
  ],
}

const LS_KEY = '29-study-guides-v2'

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Store
      if (parsed.groups && parsed.classes && parsed.nextId) return parsed
    }
  } catch {}
  return SEED
}

function saveStore(store: Store) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)) } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function safeHref(raw: string): string {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : '#'
  } catch {
    return '#'
  }
}

// ─── Add Modal ────────────────────────────────────────────────────────────────

function AddModal({
  classes,
  onClose,
  onAdded,
}: {
  classes: DBClass[]
  onClose: () => void
  onAdded: (classId: number, className: string, guide: Omit<Guide, 'id' | 'class_id' | 'created_at'>) => void
}) {
  const [classId, setClassId] = useState<number | 'new'>(classes[0]?.id ?? 'new')
  const [newClassName, setNewClassName] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (classId === 'new' && !newClassName.trim()) {
      setError('Class name required')
      return
    }
    if (!title.trim()) { setError('Title required'); return }
    if (!url.trim()) { setError('URL required'); return }

    try { new URL(url) } catch { setError('Enter a valid URL (https://…)'); return }

    setSubmitting(true)

    const resolvedClassId = classId === 'new' ? Date.now() : classId
    const resolvedClassName = classId === 'new' ? newClassName.trim() : (classes.find(c => c.id === classId)?.name ?? '')

    onAdded(resolvedClassId, resolvedClassName, { title: title.trim(), type: 'link', url: url.trim() })
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-resource-title">
        <div className="w-full max-w-md border border-gray-200 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 id="add-resource-title" className="text-xs font-light text-gray-900">Add Resource</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Close">
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
                  placeholder="e.g. Pre-Calculus"
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="resource-url" className="text-xs font-light text-gray-500">URL</label>
              <input
                id="resource-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                type="url"
                required
                maxLength={2048}
                className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            {error && <p className="text-xs text-red-500" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="rounded-none bg-gray-900 py-2.5 text-xs font-light text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding…' : 'Add Resource'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudyGuides() {
  const [store, setStore] = useState<Store>(SEED)
  const [hydrated, setHydrated] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    setStore(loadStore())
    setHydrated(true)
  }, [])

  function handleAdded(classId: number, className: string, guide: Omit<Guide, 'id' | 'class_id' | 'created_at'>) {
    setStore((prev) => {
      const id = prev.nextId
      const newGuide: Guide = { ...guide, id, class_id: classId, created_at: new Date().toISOString() }

      const existingGroup = prev.groups.find((g) => g.id === classId)
      const updatedGroups = existingGroup
        ? prev.groups.map((g) => g.id === classId ? { ...g, guides: [...g.guides, newGuide] } : g)
        : [...prev.groups, { id: classId, name: className, guides: [newGuide] }]

      const existingClass = prev.classes.find((c) => c.id === classId)
      const updatedClasses = existingClass
        ? prev.classes
        : [...prev.classes, { id: classId, name: className }]

      const next: Store = { groups: updatedGroups, classes: updatedClasses, nextId: id + 1 }
      saveStore(next)
      return next
    })
    setModalOpen(false)
  }

  function handleDelete(guideId: number) {
    setDeletingId(guideId)
    setStore((prev) => {
      const updatedGroups = prev.groups
        .map((g) => ({ ...g, guides: g.guides.filter((guide) => guide.id !== guideId) }))
        .filter((g) => g.guides.length > 0)
      const next: Store = { ...prev, groups: updatedGroups }
      saveStore(next)
      return next
    })
    setDeletingId(null)
  }

  const { groups, classes } = store
  const total = groups.reduce((n, g) => n + g.guides.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {hydrated ? `${total} resource${total === 1 ? '' : 's'}` : '…'}
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-none bg-gray-900 px-4 py-2 text-xs font-light text-white hover:bg-gray-700 transition-colors"
        >
          + Add Resource
        </button>
      </div>

      {groups.length === 0 ? (
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
                <h2 className="text-xs font-light text-gray-500 shrink-0">{group.name}</h2>
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
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
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
          onAdded={handleAdded}
        />
      )}
    </div>
  )
}
