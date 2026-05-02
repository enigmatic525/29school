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
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <AppNav name={profile.name} />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 py-8">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 text-[11px] text-gray-400 border-t border-gray-100">
        29.school · Built by the Class of 2029
      </footer>
    </div>
  )
}
