// Client-side UI preferences, stored in localStorage like the rest of the
// Dashboard's local state (completed assignments, planned dates, custom tasks).

const WEEKLY_TRACKER_DISABLED = '29-weekly-tracker-disabled'

export function loadWeeklyTrackerEnabled(): boolean {
  try {
    return localStorage.getItem(WEEKLY_TRACKER_DISABLED) !== '1'
  } catch {
    return true
  }
}

export function saveWeeklyTrackerEnabled(enabled: boolean) {
  try {
    if (enabled) localStorage.removeItem(WEEKLY_TRACKER_DISABLED)
    else localStorage.setItem(WEEKLY_TRACKER_DISABLED, '1')
  } catch {}
}
