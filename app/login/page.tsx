'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginContent() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
        const data = await res.json()
        setError(data.error || 'Invalid token')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative">
      {fromSettings && (
        <button
          onClick={() => router.back()}
          className="absolute top-5 left-5 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Cancel"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
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
            <label className="text-xs font-light text-gray-500">
              Canvas Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token here"
              required
              autoFocus
              className="rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="rounded-none bg-gray-900 py-2.5 text-xs font-light text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting…' : 'Connect Canvas'}
          </button>
        </form>

        <details className="mt-8">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition-colors">
            How do I get my access token?
          </summary>
          <ol className="mt-3 flex flex-col gap-1.5 text-xs text-gray-500 list-decimal list-inside leading-relaxed border-l-2 border-gray-200 pl-4">
            <li>Go to <strong className="text-gray-700">eastsideprep.instructure.com</strong></li>
            <li>Click your profile picture → <strong className="text-gray-700">Account → Settings</strong></li>
            <li>Scroll to <strong className="text-gray-700">Approved Integrations</strong></li>
            <li>Click <strong className="text-gray-700">+ New Access Token</strong></li>
            <li>Copy the token and paste it above</li>
          </ol>
        </details>
      </div>
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
