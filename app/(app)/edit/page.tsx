import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { fetchAllAssignments } from '@/lib/canvas'
import CalendarHeatmap from '@/components/CalendarHeatmap'

export const metadata: Metadata = { title: 'Edit' }

export default async function EditPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')

  if (!session.canvasToken) {
    return (
      <div className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Connect Canvas to edit your calendar
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
          Link your Canvas account to drag assignments across the calendar and plan
          your week.
        </p>
        <Link
          href="/login?from=settings"
          className="inline-block rounded-none bg-gray-900 dark:bg-gray-100 px-5 py-2.5 text-xs font-light text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
        >
          Connect Canvas
        </Link>
      </div>
    )
  }

  const { assignments } = await fetchAllAssignments(session.canvasToken)

  if (assignments.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No assignments with due dates yet.</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          We only show assignments with a due date set in Canvas.
        </p>
      </div>
    )
  }

  return <CalendarHeatmap assignments={assignments} showBoth />
}
