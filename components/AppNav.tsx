'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const TABS = [
  { label: 'Workload', href: '/dashboard' },
  { label: 'Feedback', href: '/feedback' },
  { label: 'Study Guides', href: '/study-guides' },
  { label: 'Notice Board', href: '/notice-board' },
]

export default function AppNav({ name }: { name: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function signOut() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b border-gray-200 bg-white px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="py-4 text-xs font-light text-gray-900 hover:text-gray-600 transition-colors shrink-0">
          Class of 2029
        </Link>

        {/* Tabs */}
        <nav className="flex items-center">
          {TABS.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-4 text-xs font-light border-b-2 transition-colors ${
                  active
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {/* User + settings */}
        <div className="flex items-center gap-3 relative shrink-0">
          <span className="text-xs text-gray-400">{name}</span>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          {settingsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSettingsOpen(false)} />
              <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100 mb-1">
                  eastsideprep.instructure.com
                </div>
                <a
                  href="/login?from=settings"
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setSettingsOpen(false)}
                >
                  Update token
                </a>
                <button
                  onClick={signOut}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-gray-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
