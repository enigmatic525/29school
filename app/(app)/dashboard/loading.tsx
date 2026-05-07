export default function Loading() {
  return (
    <>
      <div className="mb-1 h-6 w-32 animate-pulse bg-gray-100" />
      <div className="mb-8 h-4 w-64 animate-pulse bg-gray-50" />
      <div className="mb-6 grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse bg-gray-50 border border-gray-100" />
        ))}
      </div>
      <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse bg-gray-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse bg-gray-50 border border-gray-100" />
    </>
  )
}
