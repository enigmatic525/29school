import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { fetchAllAssignments, fetchRecentSubmissions } from '@/lib/canvas'
import CanvasView from '@/components/CanvasView'

export const metadata: Metadata = { title: 'Canvas' }

export default async function CanvasPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')

  if (!session.canvasToken) {
    return (
      <div className="border border-gray-200 bg-gray-50 p-8">
        <p className="text-sm font-medium text-gray-900 mb-2">
          Connect Canvas to see your assignments
        </p>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          Link your Canvas account to see upcoming due dates, mark assignments complete,
          and access your grade overview.
        </p>
        <Link
          href="/login?from=settings"
          className="inline-block rounded-none bg-gray-900 px-5 py-2.5 text-xs font-light text-white hover:bg-gray-700 transition-colors"
        >
          Connect Canvas
        </Link>
      </div>
    )
  }

  const { assignments, courses } = await fetchAllAssignments(session.canvasToken)
  const recentGrades = await fetchRecentSubmissions(session.canvasToken, courses)

  if (assignments.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">No assignments with due dates yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          We only show assignments with a due date set in Canvas.
        </p>
      </div>
    )
  }

  return <CanvasView assignments={assignments} recentGrades={recentGrades} />
}
