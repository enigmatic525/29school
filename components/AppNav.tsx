'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const TABS = [
  { label: 'Workload', href: '/dashboard' },
  { label: 'Feedback', href: '/feedback' },
  { label: 'Study Guides', href: '/study-guides' },
  { label: 'Notice Board', href: '/notice-board' },
]

export default function AppNav({ name, isGuest = false }: { name: string; isGuest?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!settingsOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [settingsOpen])

  async function signOut() {
    setSettingsOpen(false)
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  const firstName = name?.trim().split(/\s+/)[0] ?? ''

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="py-4 text-xs font-light text-gray-900 hover:text-gray-600 transition-colors shrink-0"
        >
          Class of 2029
        </Link>

        {/* Tabs */}
        <nav
          aria-label="Primary"
          className="flex items-center -mx-1 overflow-x-auto scrollbar-none"
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`px-3 sm:px-4 py-4 text-xs font-light border-b-2 transition-colors whitespace-nowrap ${
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
          <span className="hidden sm:inline text-xs text-gray-400 truncate max-w-[10rem]">
            {name}
          </span>
          <span className="sm:hidden text-xs text-gray-400 truncate max-w-[5rem]">
            {firstName}
          </span>
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Settings"
            aria-haspopup="menu"
            aria-expanded={settingsOpen}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          {settingsOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSettingsOpen(false)}
                aria-hidden="true"
              />
              <div
                ref={menuRef}
                role="menu"
                className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
              >
                <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100 mb-1 truncate">
                  {isGuest ? 'Guest mode' : name}
                </div>
                <Link
                  role="menuitem"
                  href="/login?from=settings"
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setSettingsOpen(false)}
                >
                  {isGuest ? 'Connect Canvas' : 'Update Canvas token'}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSettingsOpen(false)
                    router.refresh()
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Refresh data
                </button>
                <Link
                  role="menuitem"
                  href="/feedback"
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setSettingsOpen(false)}
                >
                  Send feedback
                </Link>
                <button
                  type="button"
                  role="menuitem"
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
