'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ScheduleWidget from './ScheduleWidget'

const NOTICES_KEY = 'notice-board-notices'
const MAX_NOTICES = 50
const MAX_NOTICE_LEN = 500

export default function NoticeBoardClient() {
  const [editing, setEditing] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [notices, setNotices] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTICES_KEY)
      if (!saved) return
      const parsed: unknown = JSON.parse(saved)
      if (!Array.isArray(parsed)) return
      // Validate every element is a string and bound size — defends against
      // a tab-XSS or hand-tampered localStorage from injecting weird shapes.
      const safe = parsed
        .filter((v): v is string => typeof v === 'string')
        .map((s) => s.slice(0, MAX_NOTICE_LEN))
        .slice(0, MAX_NOTICES)
      setNotices(safe)
    } catch {}
  }, [])

  async function submitPassword() {
    if (pwLoading) return
    setPwLoading(true)
    setPwError('')
    try {
      const res = await fetch('/api/notice-board/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      if (res.ok) {
        setEditing(true)
        setShowPrompt(false)
        setPw('')
      } else if (res.status === 401) {
        setPwError('Incorrect password.')
      } else if (res.status === 429) {
        setPwError('Too many attempts. Try again later.')
      } else {
        setPwError('Could not unlock. Try again.')
      }
    } catch {
      setPwError('Network error. Try again.')
    } finally {
      setPwLoading(false)
    }
  }

  function save() {
    const trimmed = notices
      .filter((n) => n.trim())
      .map((n) => n.slice(0, MAX_NOTICE_LEN))
      .slice(0, MAX_NOTICES)
    setNotices(trimmed)
    try {
      localStorage.setItem(NOTICES_KEY, JSON.stringify(trimmed))
    } catch {}
    setEditing(false)
  }

  return (
    <>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-light">Notice Board</h1>
        {editing ? (
          <button
            onClick={save}
            className="text-xs font-medium text-gray-900 dark:text-gray-100 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => setShowPrompt(true)}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
      <p className="mb-8 text-xs text-gray-400 dark:text-gray-500">
        Announcements and reminders from your grade rep.
      </p>

      {/* Notices */}
      {editing ? (
        <div className="border border-gray-200 dark:border-gray-800 p-6 mb-6">
          {notices.map((notice, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input
                value={notice}
                onChange={e =>
                  setNotices(prev => prev.map((n, ni) => (ni === i ? e.target.value : n)))
                }
                className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                placeholder="Notice text…"
              />
              <button
                onClick={() => setNotices(prev => prev.filter((_, ni) => ni !== i))}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setNotices(prev => [...prev, ''])}
            className="mt-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            + Add notice
          </button>
        </div>
      ) : notices.length > 0 ? (
        <div className="border border-gray-200 dark:border-gray-800 p-6 mb-6 space-y-2">
          {notices.map((notice, i) => (
            <p key={i} className="text-sm text-gray-700 dark:text-gray-300">{notice}</p>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Nothing to announce right now.</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Check back here for upcoming class events, deadlines, and reminders.
          </p>
          <Link
            href="/feedback"
            className="mt-4 inline-block text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Have something to share? Send anonymous feedback →
          </Link>
        </div>
      )}

      <ScheduleWidget editing={editing} />

      {/* Password modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 w-72">
            <p className="mb-4 text-sm font-medium text-gray-900 dark:text-gray-100">Enter password to edit</p>
            <input
              autoFocus
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setPwError('') }}
              onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
              autoComplete="off"
              maxLength={256}
              disabled={pwLoading}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-gray-500 disabled:opacity-60"
              placeholder="Password"
            />
            {pwError && <p className="mt-1.5 text-xs text-red-500">{pwError}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowPrompt(false); setPw(''); setPwError('') }}
                disabled={pwLoading}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitPassword}
                disabled={pwLoading || !pw}
                className="bg-gray-900 dark:bg-gray-100 px-4 py-1.5 text-xs text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-60"
              >
                {pwLoading ? 'Checking…' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
