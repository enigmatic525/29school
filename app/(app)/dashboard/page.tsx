import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { fetchAllAssignments } from '@/lib/canvas'
import CalendarHeatmap from '@/components/CalendarHeatmap'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')

  if (!session.canvasToken) {
    return (
      <>
        <h1 className="mb-1 text-xl font-light">My Dashboard</h1>
        <p className="mb-8 text-xs text-gray-400">
          You&apos;re using 29.school without a Canvas token.
        </p>
        <div className="border border-gray-200 bg-gray-50 p-8">
          <p className="text-sm font-medium text-gray-900 mb-2">
            Connect Canvas to see your Dashboard
          </p>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            The Dashboard pulls due dates from your Canvas account. Connect now to enable
            it — or keep using feedback, study guides, and the notice board.
          </p>
          <Link
            href="/login?from=settings"
            className="inline-block rounded-none bg-gray-900 px-5 py-2.5 text-xs font-light text-white hover:bg-gray-700 transition-colors"
          >
            Connect Canvas
          </Link>
        </div>
      </>
    )
  }

  const { assignments } = await fetchAllAssignments(session.canvasToken)

  if (assignments.length === 0) {
    return (
      <>
        <h1 className="mb-1 text-xl font-light">My Dashboard</h1>
        <p className="mb-8 text-xs text-gray-400">Pulled live from Canvas</p>
        <div className="border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">No assignments with due dates yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            We only show assignments that have a due date set in Canvas. Check back after your
            teachers post the next batch.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-light">My Dashboard</h1>
      <p className="mb-8 text-xs text-gray-400">Pulled live from Canvas</p>
      <CalendarHeatmap assignments={assignments} />
    </>
  )
}
