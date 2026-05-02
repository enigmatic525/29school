import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-3">404</p>
        <h1 className="text-2xl font-light text-gray-900 mb-3">Page not found</h1>
        <p className="text-sm text-gray-500 mb-8">
          That page doesn&apos;t exist — it may have been moved or removed.
        </p>
        <Link
          href="/dashboard"
          className="rounded-none bg-gray-900 px-5 py-2.5 text-xs font-light text-white hover:bg-gray-700 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
