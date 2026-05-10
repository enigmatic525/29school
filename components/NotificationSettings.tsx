'use client'

import { useState } from 'react'

export interface NotificationSettingsInitial {
  enabled: boolean
  email: string | null
  paused: boolean
  pauseReason: string | null
}

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'sending-test' }
  | { kind: 'disabling' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

export default function NotificationSettings({
  initial,
  suggestedEmail,
}: {
  initial: NotificationSettingsInitial
  suggestedEmail: string | null
}) {
  const [enabled, setEnabled] = useState(initial.enabled)
  const [email, setEmail] = useState(initial.email ?? suggestedEmail ?? '')
  const [paused, setPaused] = useState(initial.paused)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const isBusy = status.kind === 'saving' || status.kind === 'sending-test' || status.kind === 'disabling'

  async function enable() {
    if (!email.trim()) {
      setStatus({ kind: 'error', message: 'Enter an email first.' })
      return
    }
    setStatus({ kind: 'saving' })
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus({ kind: 'error', message: data?.error || 'Could not enable.' })
        return
      }
      setEnabled(true)
      setPaused(false)
      setStatus({ kind: 'success', message: 'Grade alerts enabled.' })
    } catch {
      setStatus({ kind: 'error', message: 'Network error.' })
    }
  }

  async function disable() {
    setStatus({ kind: 'disabling' })
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus({ kind: 'error', message: data?.error || 'Could not disable.' })
        return
      }
      setEnabled(false)
      setPaused(false)
      setStatus({ kind: 'success', message: 'Grade alerts disabled.' })
    } catch {
      setStatus({ kind: 'error', message: 'Network error.' })
    }
  }

  async function sendTest() {
    setStatus({ kind: 'sending-test' })
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus({ kind: 'error', message: data?.error || 'Could not send test.' })
        return
      }
      setStatus({ kind: 'success', message: 'Test email sent — check your inbox.' })
    } catch {
      setStatus({ kind: 'error', message: 'Network error.' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {paused && (
        <div className="border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Alerts are paused
          {initial.pauseReason === 'token_invalid' && ' — your stored Canvas token stopped working. Re-enable below to resume with a fresh token.'}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notif-email" className="text-xs font-light text-gray-500 dark:text-gray-400">
          Email address
        </label>
        <input
          id="notif-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu"
          disabled={isBusy}
          maxLength={254}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-gray-900 dark:focus:border-gray-400 transition-colors disabled:opacity-60"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!enabled ? (
          <button
            type="button"
            onClick={enable}
            disabled={isBusy || !email.trim()}
            className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 text-xs font-light hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status.kind === 'saving' ? 'Enabling…' : 'Enable grade alerts'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={enable}
              disabled={isBusy}
              className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-xs font-light text-gray-700 dark:text-gray-300 hover:border-gray-500 dark:hover:border-gray-500 transition-colors disabled:opacity-60"
            >
              {status.kind === 'saving' ? 'Saving…' : 'Update email'}
            </button>
            <button
              type="button"
              onClick={sendTest}
              disabled={isBusy}
              className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-xs font-light text-gray-700 dark:text-gray-300 hover:border-gray-500 dark:hover:border-gray-500 transition-colors disabled:opacity-60"
            >
              {status.kind === 'sending-test' ? 'Sending…' : 'Send test email'}
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={isBusy}
              className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-60 ml-auto"
            >
              {status.kind === 'disabling' ? 'Disabling…' : 'Disable'}
            </button>
          </>
        )}
      </div>

      {status.kind === 'success' && (
        <p className="text-xs text-green-600 dark:text-green-400" role="status">
          {status.message}
        </p>
      )}
      {status.kind === 'error' && (
        <p className="text-xs text-red-500" role="alert">
          {status.message}
        </p>
      )}

      <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed mt-2">
        Your Canvas access token is stored encrypted (AES-256-GCM) so the cron job can poll
        Canvas on your behalf. Disabling deletes the stored token immediately.
      </p>
    </div>
  )
}
