'use client'

import { useState, useEffect } from 'react'
import { loadWeeklyTrackerEnabled, saveWeeklyTrackerEnabled } from '@/lib/ui-prefs'

export default function WeeklyTrackerSetting() {
  const [ready, setReady] = useState(false)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setEnabled(loadWeeklyTrackerEnabled())
    setReady(true)
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    saveWeeklyTrackerEnabled(next)
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-600 dark:text-gray-300">
        {!ready ? 'Weekly tracker' : enabled ? 'Weekly tracker is on' : 'Weekly tracker is off'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle weekly tracker"
        onClick={toggle}
        disabled={!ready}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          enabled ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
            enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
