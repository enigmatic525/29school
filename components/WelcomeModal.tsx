'use client'

import { useEffect, useState } from 'react'

export const WELCOME_STORAGE_KEY = '29-welcome-seen'

interface Step {
  title: string
  body: string
  icon: React.ReactNode
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Class of 2029',
    body: 'A companion for your Canvas account — built to make your week easier to see, plan, and stay on top of.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 7l9-5 9 5-9 5-9-5z" />
        <path d="M3 7v6l9 5 9-5V7" />
        <path d="M12 12v10" />
      </svg>
    ),
  },
  {
    title: 'Your assignments at a glance',
    body: 'See what’s due today, tomorrow, and the rest of the week. Past dates stay visible so nothing slips through.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="1.5" />
        <path d="M3 9h18" />
        <path d="M8 3v4M16 3v4" />
        <path d="M8 13h2M14 13h2M8 17h2M14 17h2" />
      </svg>
    ),
  },
  {
    title: 'Plan your week',
    body: 'Drag assignments onto earlier dates on the calendar, balance your load, and spot heavy weeks before they hit.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 21V7l4-3 4 3v14" />
        <path d="M11 11l4-2 6 2v10" />
        <path d="M15 21V11" />
      </svg>
    ),
  },
  {
    title: 'Connect Canvas to get started',
    body: 'Paste your Canvas access token below. It stays in an encrypted, http-only cookie in your browser — never logged or stored. Or explore as a guest first.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="11" width="16" height="10" rx="1.5" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    ),
  },
]

interface Props {
  open: boolean
  onClose: () => void
  onExploreAsGuest?: () => void
}

export default function WelcomeModal({ open, onClose, onExploreAsGuest }: Props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setStep((s) => Math.min(STEPS.length - 1, s + 1))
      else if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={onClose}
              aria-label="Close welcome"
              className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-8 flex flex-col items-center text-center">
            <div className="mb-5 text-gray-700 dark:text-gray-200">{current.icon}</div>
            <h2 id="welcome-title" className="text-lg font-light text-gray-900 dark:text-gray-100 mb-2">
              {current.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
              {current.body}
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 pb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step
                    ? 'bg-gray-700 dark:bg-gray-200'
                    : 'bg-gray-200 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-500'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
            {!isFirst ? (
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="text-xs text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                ← Back
              </button>
            ) : onExploreAsGuest ? (
              <button
                onClick={onExploreAsGuest}
                className="text-xs text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                Explore as guest
              </button>
            ) : (
              <span />
            )}
            <div className="ml-auto flex items-center gap-2">
              {!isLast && (
                <button
                  onClick={onClose}
                  className="text-xs text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
                className="rounded-none bg-gray-900 dark:bg-gray-100 px-4 py-1.5 text-xs font-light text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
              >
                {isLast ? 'Get started' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
