'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function HeaderActions({ name }: { name: string }) {
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function signOut() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3 relative">
      <span className="text-sm text-zinc-400">{name}</span>

      <button
        onClick={() => setSettingsOpen(!settingsOpen)}
        className="text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-label="Settings"
      >
        {/* Gear / cog icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>

      {settingsOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setSettingsOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
            <div className="px-3 py-2 text-xs text-zinc-500 border-b border-zinc-800 mb-1">
              eastsideprep.instructure.com
            </div>
            <a
              href="/login"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              onClick={() => setSettingsOpen(false)}
            >
              Update token
            </a>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
