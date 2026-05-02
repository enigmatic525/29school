'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="border border-red-200 bg-red-50 p-8 text-center">
      <p className="text-xs font-light text-red-700 mb-1">Something went wrong</p>
      <p className="text-sm text-red-600 mb-5">
        We couldn&apos;t load this page. This is usually a temporary connection issue with Canvas.
      </p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-none bg-gray-900 px-4 py-2 text-xs font-light text-white hover:bg-gray-700 transition-colors"
        >
          Try again
        </button>
        <a
          href="/login?from=settings"
          className="rounded-none border border-gray-300 px-4 py-2 text-xs font-light text-gray-700 hover:border-gray-500 transition-colors"
        >
          Re-enter token
        </a>
      </div>
      {error.digest && (
        <p className="mt-4 text-[10px] text-red-400 font-mono">ref: {error.digest}</p>
      )}
    </div>
  )
}
