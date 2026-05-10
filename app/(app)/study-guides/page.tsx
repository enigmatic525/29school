import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import StudyGuides from '@/components/StudyGuides'

export const metadata: Metadata = { title: 'Study Guides' }

export default async function StudyGuidesPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')

  return (
    <>
      <h1 className="mb-1 text-xl font-light">Study Guides</h1>
      <p className="mb-8 text-xs text-gray-400">Resources by course.</p>
      <StudyGuides />
    </>
  )
}
