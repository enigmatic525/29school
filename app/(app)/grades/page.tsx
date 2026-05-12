import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { fetchGradesAndCourses, fetchRecentSubmissions } from '@/lib/canvas'
import GradesView from '@/components/GradesView'

export const metadata: Metadata = { title: 'Grades' }

export default async function GradesPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')

  if (!session.canvasToken) {
    return (
      <>
        <div className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Connect Canvas to see your grades
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
            Link your Canvas account to see your current grades and GPA across all courses.
          </p>
          <Link
            href="/login?from=settings"
            className="inline-block rounded-none bg-gray-900 dark:bg-gray-100 px-5 py-2.5 text-xs font-light text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
          >
            Connect Canvas
          </Link>
        </div>
      </>
    )
  }

  // fetchRecentSubmissions needs the course list, so we kick off Grades+Courses first
  // and then fan out per-course submission fetches in parallel inside it.
  const { grades, courses } = await fetchGradesAndCourses(session.canvasToken)
  const recentGrades = await fetchRecentSubmissions(session.canvasToken, courses)

  if (grades.length === 0 && recentGrades.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No grades available yet.</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Grades will appear here once your teachers post scores in Canvas.
        </p>
      </div>
    )
  }

  return <GradesView grades={grades} recentGrades={recentGrades} />
}
