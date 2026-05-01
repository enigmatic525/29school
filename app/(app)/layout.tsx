import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { fetchProfile } from '@/lib/canvas'
import AppNav from '@/components/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.isLoggedIn || !session.canvasToken) redirect('/login')

  let profile: { name: string; primary_email: string }
  try {
    profile = await fetchProfile(session.canvasToken)
  } catch {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <AppNav name={profile.name} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        {children}
      </main>
    </div>
  )
}
