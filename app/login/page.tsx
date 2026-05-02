'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginContent() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmGuestOpen, setConfirmGuestOpen] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromSettings = searchParams.get('from') === 'settings'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })
      if (!res.ok) {
        let msg = 'Invalid token. Make sure you copied the full string.'
        try {
          const data = await res.json()
          if (data?.error && typeof data.error === 'string') msg = data.error
        } catch {
          // ignore
        }
        setError(msg)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function continueAsGuest() {
    setError('')
    setGuestLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest: true }),
      })
      if (!res.ok) {
        setError('Could not continue without a token. Try again.')
        setGuestLoading(false)
        return
      }
      setConfirmGuestOpen(false)
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error. Try again.')
      setGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative">
      {fromSettings ? (
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute top-5 left-5 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Cancel"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      ) : (
        <Link
          href="/"
          className="absolute top-5 left-5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← Back
        </Link>
      )}

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="h-px flex-1 bg-gray-300" />
            <span className="text-3xl font-light text-gray-900">Class of 2029</span>
            <div className="h-px flex-1 bg-gray-300" />
          </div>
          <p className="text-xs text-gray-400">eastsideprep.instructure.com</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="canvas-token" className="text-xs font-light text-gray-500">
              Canvas Access Token
            </label>
            <input
              id="canvas-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token here"
              required
              autoFocus
              autoComplete="off"
              spellCheck={false}
              minLength={8}
              maxLength={200}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
              className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          {error && (
            <p id="login-error" className="text-xs text-red-500" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="rounded-none bg-gray-900 py-2.5 text-xs font-light text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting…' : 'Connect Canvas'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setConfirmGuestOpen(true)}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors underline-offset-4 hover:underline"
          >
            Use without token?
          </button>
        </div>

        <details className="mt-8">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition-colors">
            How do I get my access token?
          </summary>
          <ol className="mt-3 flex flex-col gap-1.5 text-xs text-gray-500 list-decimal list-inside leading-relaxed border-l-2 border-gray-200 pl-4">
            <li>
              Go to <strong className="text-gray-700">eastsideprep.instructure.com</strong>
            </li>
            <li>
              Click your profile picture →{' '}
              <strong className="text-gray-700">Account → Settings</strong>
            </li>
            <li>
              Scroll to <strong className="text-gray-700">Approved Integrations</strong>
            </li>
            <li>
              Click <strong className="text-gray-700">+ New Access Token</strong>
            </li>
            <li>Copy the token and paste it above</li>
          </ol>
        </details>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Is this secure?
          </summary>
          <div className="mt-3 flex flex-col gap-2 text-xs text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-4">
            <p>
              Your token is stored only in your browser, in an httpOnly encrypted cookie.
              JavaScript on the page can&apos;t read it, so XSS can&apos;t exfiltrate it directly.
            </p>
            <p>
              It&apos;s never written to a database, log file, or email. The server holds it only
              in memory for the duration of a request, to call Canvas.
            </p>
            <p>
              The cookie is encrypted with{' '}
              <code className="px-1 bg-gray-100 rounded text-[11px]">SESSION_SECRET</code>, so even
              if someone intercepts your raw cookie they can&apos;t decrypt it without that secret.
            </p>
          </div>
        </details>
      </div>

      {confirmGuestOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
            onClick={() => !guestLoading && setConfirmGuestOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-confirm-title"
          >
            <div className="w-full max-w-sm border border-gray-200 bg-white p-6 shadow-xl">
              <h2 id="guest-confirm-title" className="text-sm font-medium text-gray-900 mb-2">
                Are you sure?
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                You won&apos;t be able to set up your workload dashboard, but other features will
                be available.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmGuestOpen(false)}
                  disabled={guestLoading}
                  className="rounded-none border border-gray-300 px-4 py-2 text-xs font-light text-gray-700 hover:border-gray-500 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={continueAsGuest}
                  disabled={guestLoading}
                  className="rounded-none bg-gray-900 px-4 py-2 text-xs font-light text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {guestLoading ? 'Continuing…' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
