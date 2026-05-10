export default function Loading() {
  return (
    <>
      <div className="mb-1 h-6 w-16 animate-pulse bg-gray-100" />
      <div className="mb-6 h-3 w-44 animate-pulse bg-gray-50" />

      {/* GPA summary */}
      <div className="border border-gray-200 bg-white px-5 py-4 mb-6 flex items-baseline gap-6">
        <div>
          <div className="h-2.5 w-24 animate-pulse bg-gray-100 mb-2" />
          <div className="h-8 w-14 animate-pulse bg-gray-100" />
        </div>
        <div className="border-l border-gray-100 pl-4">
          <div className="h-2.5 w-12 animate-pulse bg-gray-100 mb-2" />
          <div className="h-8 w-8 animate-pulse bg-gray-100" />
        </div>
        <div className="border-l border-gray-100 pl-4">
          <div className="h-2.5 w-16 animate-pulse bg-gray-100 mb-2" />
          <div className="h-8 w-8 animate-pulse bg-gray-100" />
        </div>
      </div>

      {/* Grade cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border border-gray-200 bg-white px-5 py-4 mb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="h-3.5 animate-pulse bg-gray-100 mb-1.5" style={{ width: `${140 + i * 20}px` }} />
              <div className="h-2.5 w-16 animate-pulse bg-gray-50" />
            </div>
            <div className="text-right">
              <div className="h-7 w-8 animate-pulse bg-gray-100 mb-1" />
              <div className="h-2.5 w-10 animate-pulse bg-gray-50" />
            </div>
          </div>
          <div className="h-0.5 bg-gray-100 rounded-full mt-3" />
        </div>
      ))}
    </>
  )
}
