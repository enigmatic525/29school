export default function Loading() {
  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-3 w-24 animate-pulse bg-gray-50 dark:bg-gray-900" />
      </div>

      {/* Assignment groups */}
      {[
        { items: 3, today: true },
        { items: 2, today: false },
        { items: 2, today: false },
      ].map((group, gi) => (
        <div key={gi} className="border border-gray-200 dark:border-gray-800 mb-0 border-b-0 last:border-b">
          <div className={`px-4 py-2.5 flex items-center gap-2 ${gi === 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <div className={`h-3 w-14 animate-pulse ${gi === 0 ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
            <div className="h-3 w-10 animate-pulse bg-gray-200 dark:bg-gray-700" />
          </div>
          {Array.from({ length: group.items }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-950 border-b border-gray-50 dark:border-gray-800 last:border-b-0">
              <div className="w-4 h-4 rounded-full border-2 border-gray-200 dark:border-gray-800 shrink-0" />
              <div className="h-2.5 w-8 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-sm shrink-0" />
              <div className="flex-1 h-3 animate-pulse bg-gray-100 dark:bg-gray-800" style={{ maxWidth: `${50 + (i * 17) % 35}%` }} />
              <div className="hidden sm:block text-right space-y-1">
                <div className="h-2.5 w-14 animate-pulse bg-gray-50 dark:bg-gray-900" />
                <div className="h-2 w-10 animate-pulse bg-gray-50 dark:bg-gray-900" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
