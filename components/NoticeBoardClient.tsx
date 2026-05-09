'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ScheduleWidget from './ScheduleWidget'

const PASSWORD = '0000'
const NOTICES_KEY = 'notice-board-notices'

export default function NoticeBoardClient() {
  const [editing, setEditing] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)
  const [notices, setNotices] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTICES_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setNotices(parsed)
      }
    } catch {}
  }, [])

  function submitPassword() {
    if (pw === PASSWORD) {
      setEditing(true)
      setShowPrompt(false)
      setPw('')
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  function save() {
    const trimmed = notices.filter(n => n.trim())
    setNotices(trimmed)
    localStorage.setItem(NOTICES_KEY, JSON.stringify(trimmed))
    setEditing(false)
  }

  return (
    <>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-light">Notice Board</h1>
        {editing ? (
          <button
            onClick={save}
            className="text-xs font-medium text-gray-900 hover:text-gray-500 transition-colors"
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => setShowPrompt(true)}
            className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
      <p className="mb-8 text-xs text-gray-400">
        Announcements and reminders from your grade rep.
      </p>

      {/* Notices */}
      {editing ? (
        <div className="border border-gray-200 p-6 mb-6">
          {notices.map((notice, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input
                value={notice}
                onChange={e =>
                  setNotices(prev => prev.map((n, ni) => (ni === i ? e.target.value : n)))
                }
                className="flex-1 border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                placeholder="Notice text…"
              />
              <button
                onClick={() => setNotices(prev => prev.filter((_, ni) => ni !== i))}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setNotices(prev => [...prev, ''])}
            className="mt-1 text-xs text-gray-400 hover:text-gray-900 transition-colors"
          >
            + Add notice
          </button>
        </div>
      ) : notices.length > 0 ? (
        <div className="border border-gray-200 p-6 mb-6 space-y-2">
          {notices.map((notice, i) => (
            <p key={i} className="text-sm text-gray-700">{notice}</p>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-gray-300 p-12 text-center mb-6">
          <p className="text-sm text-gray-500">Nothing to announce right now.</p>
          <p className="mt-1 text-xs text-gray-400">
            Check back here for upcoming class events, deadlines, and reminders.
          </p>
          <Link
            href="/feedback"
            className="mt-4 inline-block text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            Have something to share? Send anonymous feedback →
          </Link>
        </div>
      )}

      <ScheduleWidget editing={editing} />

      {/* Password modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white border border-gray-200 p-6 w-72">
            <p className="mb-4 text-sm font-medium text-gray-900">Enter password to edit</p>
            <input
              autoFocus
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setPwError(false) }}
              onKeyDown={e => e.key === 'Enter' && submitPassword()}
              className="w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
              placeholder="Password"
            />
            {pwError && <p className="mt-1.5 text-xs text-red-500">Incorrect password.</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowPrompt(false); setPw(''); setPwError(false) }}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitPassword}
                className="bg-gray-900 px-4 py-1.5 text-xs text-white hover:bg-gray-700 transition-colors"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
