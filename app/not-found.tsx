import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[var(--background)] px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-3">404</p>
        <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-3">Page not found</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          That page doesn&apos;t exist — it may have been moved or removed.
        </p>
        <Link
          href="/dashboard"
          className="rounded-none bg-gray-900 dark:bg-gray-100 px-5 py-2.5 text-xs font-light text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
