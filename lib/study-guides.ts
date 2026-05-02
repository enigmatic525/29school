import 'server-only'
import { supabase } from './supabase'

export interface Guide {
  id: number
  class_id: number
  title: string
  type: 'pdf' | 'link'
  url: string
  created_at: string
}

export interface ClassGroup {
  id: number
  name: string
  guides: Guide[]
}

export interface DBClass {
  id: number
  name: string
}

export interface StudyGuidesPayload {
  groups: ClassGroup[]
  classes: DBClass[]
  schemaMissing?: boolean
}

interface RawGuide extends Guide {
  classes?: { name: string } | { name: string }[] | null
}

function joinedName(raw: RawGuide['classes']): string {
  if (!raw) return ''
  if (Array.isArray(raw)) return raw[0]?.name ?? ''
  return raw.name ?? ''
}

// PostgREST returns this code when the table doesn't exist or isn't in the
// schema cache. Treat it as "DB not initialized" rather than a hard error.
const SCHEMA_MISSING_CODE = 'PGRST205'

export async function loadStudyGuides(): Promise<StudyGuidesPayload | { error: string }> {
  const [{ data: guides, error: guidesError }, { data: classes, error: classesError }] =
    await Promise.all([
      supabase
        .from('study_guides')
        .select('*, classes(name)')
        .order('created_at', { ascending: true }),
      supabase.from('classes').select('*').order('name'),
    ])

  if (guidesError?.code === SCHEMA_MISSING_CODE || classesError?.code === SCHEMA_MISSING_CODE) {
    return { groups: [], classes: [], schemaMissing: true }
  }
  if (guidesError) {
    console.error('study-guides load error', guidesError)
    return { error: 'Could not load study guides' }
  }
  if (classesError) {
    console.error('study-guides classes error', classesError)
    return { error: 'Could not load classes' }
  }

  const map: Record<number, ClassGroup> = {}
  for (const row of (guides ?? []) as RawGuide[]) {
    const cid = row.class_id
    if (!map[cid]) map[cid] = { id: cid, name: joinedName(row.classes), guides: [] }
    const { id, class_id, title, type, url, created_at } = row
    map[cid].guides.push({ id, class_id, title, type, url, created_at })
  }

  return { groups: Object.values(map), classes: classes ?? [] }
}
