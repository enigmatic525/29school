import Link from 'next/link'

const features = [
  {
    title: 'Assignment Load Calendar',
    description: 'See every due date across all your courses on one heatmap. Spot the brutal weeks before they hit.',
  },
  {
    title: 'Anonymous Feedback',
    description: 'Submit concerns directly to your grade rep — no name, no judgment, just honest input.',
  },
  {
    title: 'Study Guide Library',
    description: 'Share and find community-made study guides organized by course and semester.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
        <span className="text-xl font-black tracking-tight">29</span>
        <Link
          href="/login"
          className="rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
        >
          Connect Canvas →
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-24 max-w-2xl mx-auto">
        <div className="mb-6">
          <span className="text-7xl font-black tracking-tight">29</span>
          <span className="ml-2 text-xl font-light text-zinc-400">.school</span>
        </div>
        <h1 className="text-2xl font-semibold leading-snug text-zinc-100 mb-4">
          Tools for the Eastside Prep Class of 2029
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed mb-8 max-w-md">
          Built by your grade rep to make workload visible, feedback easy, and studying less chaotic.
        </p>
        <Link
          href="/login"
          className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
        >
          View Your Assignment Calendar
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col gap-2"
            >
              <h3 className="text-sm font-semibold text-zinc-100">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-5 text-center text-xs text-zinc-600">
        29.school · Eastside Prep Class of 2029
      </footer>
    </div>
  )
}
