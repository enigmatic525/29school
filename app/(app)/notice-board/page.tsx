import Link from 'next/link'

export default function NoticeBoardPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-light">Notice Board</h1>
      <p className="mb-8 text-xs text-gray-400">
        Announcements and reminders from your grade rep.
      </p>
      <div className="border border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">Nothing to announce right now.</p>
        <p className="mt-1 text-xs text-gray-400">
          Check back here for upcoming class events, deadlines, and reminders.
        </p>
        <Link
          href="/feedback"
          className="mt-4 inline-block text-xs text-gray-500 hover:text-gray-900 transition-colors"
        >
          Have something to share? Send anonymous feedback →
        </Link>
      </div>
    </>
  )
}
