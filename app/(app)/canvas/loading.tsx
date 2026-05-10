export default function Loading() {
  return (
    <>
      {/* Sub-tabs */}
      <div className="flex gap-5 border-b border-gray-200 mb-6">
        <div className="h-3 w-20 animate-pulse bg-gray-100 mb-2.5" />
        <div className="h-3 w-8 animate-pulse bg-gray-50 mb-2.5" />
        <div className="h-3 w-16 animate-pulse bg-gray-50 mb-2.5" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-3 w-24 animate-pulse bg-gray-50" />
      </div>

      {/* Assignment groups */}
      {[
        { items: 3, today: true },
        { items: 2, today: false },
        { items: 2, today: false },
      ].map((group, gi) => (
        <div key={gi} className="border border-gray-200 mb-0 border-b-0 last:border-b">
          <div className={`px-4 py-2.5 flex items-center gap-2 ${gi === 0 ? 'bg-gray-200' : 'bg-gray-100'}`}>
            <div className={`h-3 w-14 animate-pulse ${gi === 0 ? 'bg-gray-300' : 'bg-gray-200'}`} />
            <div className="h-3 w-10 animate-pulse bg-gray-200" />
          </div>
          {Array.from({ length: group.items }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-50 last:border-b-0">
              <div className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />
              <div className="h-2.5 w-8 animate-pulse bg-gray-100 rounded-sm shrink-0" />
              <div className="flex-1 h-3 animate-pulse bg-gray-100" style={{ maxWidth: `${50 + (i * 17) % 35}%` }} />
              <div className="hidden sm:block text-right space-y-1">
                <div className="h-2.5 w-14 animate-pulse bg-gray-50" />
                <div className="h-2 w-10 animate-pulse bg-gray-50" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
