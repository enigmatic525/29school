import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { fetchProfile } from '@/lib/canvas'
import { getPref } from '@/lib/notifications'
import NotificationSettings, { type NotificationSettingsInitial } from '@/components/NotificationSettings'
import WeeklyTrackerSetting from '@/components/WeeklyTrackerSetting'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await getSession()
  const isGuest = !session.canvasToken
  const canvasUserId = session.canvasUserId ?? null

  let suggestedEmail: string | null = null
  if (session.canvasToken) {
    try {
      const profile = await fetchProfile(session.canvasToken)
      if (typeof profile.primary_email === 'string') suggestedEmail = profile.primary_email
    } catch {
      // ignore — settings page still renders, just without a prefilled email
    }
  }

  let initial: NotificationSettingsInitial = { enabled: false, email: null, paused: false, pauseReason: null }
  if (canvasUserId) {
    const pref = await getPref(canvasUserId)
    if (pref) {
      initial = {
        enabled: pref.alerts_enabled && !pref.paused_at,
        email: pref.email,
        paused: pref.paused_at !== null,
        pauseReason: pref.pause_reason,
      }
    }
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-light">Settings</h1>
      <p className="mb-8 text-xs text-gray-400 dark:text-gray-500">
        Notifications, account, and preferences.
      </p>

      <section className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 mb-6">
        <h2 className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">Grade alerts</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Get an email when new grades are posted on Canvas. We poll Canvas every 15 minutes
          using your access token, which is encrypted at rest.
        </p>

        {isGuest ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Connect your Canvas token to enable grade alerts.
          </p>
        ) : !canvasUserId ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Sign in again to enable notifications. Your session predates this feature.
          </p>
        ) : (
          <NotificationSettings initial={initial} suggestedEmail={suggestedEmail} />
        )}
      </section>

      <section className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 mb-6">
        <h2 className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">Weekly tracker</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          A pop-out panel on the Canvas page showing your completion ring and streak for the
          current week. Turn it off to hide the panel and its edge tab entirely.
        </p>
        <WeeklyTrackerSetting />
      </section>
    </>
  )
}
