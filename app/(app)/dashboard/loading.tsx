export default function Loading() {
  return (
    <>
      <div className="mb-8 h-6 w-28 animate-pulse bg-gray-100" />
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse bg-gray-100" />
        ))}
      </div>
    </>
  )
}
