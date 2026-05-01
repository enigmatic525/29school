import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('study_guides')
    .select('*, classes(name)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by class
  const map: Record<number, { id: number; name: string; guides: typeof data }> = {}
  for (const guide of data ?? []) {
    const cid = guide.class_id
    if (!map[cid]) map[cid] = { id: cid, name: (guide.classes as any)?.name ?? '', guides: [] }
    map[cid].guides.push(guide)
  }

  const { data: classes } = await supabase.from('classes').select('*').order('name')

  return NextResponse.json({ groups: Object.values(map), classes: classes ?? [] })
}

export async function POST(request: NextRequest) {
  const { classId, title, type, url } = await request.json()
  if (!classId || !title || !type || !url) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('study_guides')
    .insert({ class_id: classId, title, type, url })
    .select('*, classes(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ guide: data })
}
