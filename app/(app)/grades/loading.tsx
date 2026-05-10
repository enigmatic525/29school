export default function Loading() {
  return (
    <>
      <div className="mb-1 h-6 w-16 animate-pulse bg-gray-100 dark:bg-gray-800" />
      <div className="mb-6 h-3 w-44 animate-pulse bg-gray-50 dark:bg-gray-900" />

      {/* GPA summary */}
      <div className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-4 mb-6 flex items-baseline gap-6">
        <div>
          <div className="h-2.5 w-24 animate-pulse bg-gray-100 dark:bg-gray-800 mb-2" />
          <div className="h-8 w-14 animate-pulse bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="border-l border-gray-100 dark:border-gray-800 pl-4">
          <div className="h-2.5 w-12 animate-pulse bg-gray-100 dark:bg-gray-800 mb-2" />
          <div className="h-8 w-8 animate-pulse bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="border-l border-gray-100 dark:border-gray-800 pl-4">
          <div className="h-2.5 w-16 animate-pulse bg-gray-100 dark:bg-gray-800 mb-2" />
          <div className="h-8 w-8 animate-pulse bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>

      {/* Grade cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-4 mb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="h-3.5 animate-pulse bg-gray-100 dark:bg-gray-800 mb-1.5" style={{ width: `${140 + i * 20}px` }} />
              <div className="h-2.5 w-16 animate-pulse bg-gray-50 dark:bg-gray-900" />
            </div>
            <div className="text-right">
              <div className="h-7 w-8 animate-pulse bg-gray-100 dark:bg-gray-800 mb-1" />
              <div className="h-2.5 w-10 animate-pulse bg-gray-50 dark:bg-gray-900" />
            </div>
          </div>
          <div className="h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-3" />
        </div>
      ))}
    </>
  )
}
