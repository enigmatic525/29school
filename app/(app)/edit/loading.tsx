export default function Loading() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="h-3 w-32 animate-pulse bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-24 animate-pulse bg-gray-50 dark:bg-gray-900" />
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse bg-gray-50 dark:bg-gray-900" />
        ))}
      </div>
      <div className="h-64 animate-pulse bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800" />
    </>
  )
}
