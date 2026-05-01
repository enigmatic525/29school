import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { fetchAllAssignments, fetchProfile } from '@/lib/canvas'
import CalendarHeatmap from '@/components/CalendarHeatmap'
import AppNav from '@/components/AppNav'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session.isLoggedIn || !session.canvasToken) redirect('/login')

  const [{ assignments }, profile] = await Promise.all([
    fetchAllAssignments(session.canvasToken),
    fetchProfile(session.canvasToken),
  ])

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <AppNav name={profile.name} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-8 text-xl font-bold uppercase tracking-widest">My Workload</h1>
        <CalendarHeatmap assignments={assignments} />
      </main>
    </div>
  )
}
