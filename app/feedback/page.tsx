import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { fetchProfile } from '@/lib/canvas'
import AppNav from '@/components/AppNav'
import FeedbackForm from '@/components/FeedbackForm'

export default async function FeedbackPage() {
  const session = await getSession()
  if (!session.isLoggedIn || !session.canvasToken) redirect('/login')
  const profile = await fetchProfile(session.canvasToken)

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <AppNav name={profile.name} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-8 text-xl font-bold uppercase tracking-widest">Feedback</h1>
        <FeedbackForm />
      </main>
    </div>
  )
}
