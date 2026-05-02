import { redirect } from 'next/navigation'
import StudyGuides from '@/components/StudyGuides'
import { loadStudyGuides } from '@/lib/study-guides'
import { getSession } from '@/lib/session'

export default async function StudyGuidesPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')

  const result = await loadStudyGuides()
  const initialGroups = 'error' in result ? [] : result.groups
  const initialClasses = 'error' in result ? [] : result.classes
  const initialError = 'error' in result ? result.error : null
  const schemaMissing = 'error' in result ? false : !!result.schemaMissing

  let supabaseHost = ''
  let sqlEditorUrl = ''
  if (schemaMissing) {
    try {
      const u = new URL(process.env.SUPABASE_URL ?? '')
      supabaseHost = u.host
      const ref = u.host.split('.')[0]
      if (ref) sqlEditorUrl = `https://supabase.com/dashboard/project/${ref}/sql/new`
    } catch {
      // Leave defaults so the banner still renders informatively.
    }
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-light">Study Guides</h1>
      <p className="mb-8 text-xs text-gray-400">Shared by your class — links and PDFs by course.</p>
      <StudyGuides
        initialGroups={initialGroups}
        initialClasses={initialClasses}
        initialError={initialError}
        schemaMissing={schemaMissing}
        supabaseHost={supabaseHost}
        sqlEditorUrl={sqlEditorUrl}
      />
    </>
  )
}
