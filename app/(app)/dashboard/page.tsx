import { getSession } from '@/lib/session'
import { fetchAllAssignments } from '@/lib/canvas'
import CalendarHeatmap from '@/components/CalendarHeatmap'

export default async function DashboardPage() {
  const session = await getSession()
  const { assignments } = await fetchAllAssignments(session.canvasToken!)

  return (
    <>
      <h1 className="mb-8 text-xl font-light">My Workload</h1>
      <CalendarHeatmap assignments={assignments} />
    </>
  )
}
