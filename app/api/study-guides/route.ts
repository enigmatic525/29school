import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { loadStudyGuides } from '@/lib/study-guides'
import {
  asTrimmedString,
  getClientIp,
  isSafeHttpUrl,
  isSameOrigin,
  readJson,
  requireAuth,
} from '@/lib/security'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const MAX_TITLE = 200
const MAX_URL = 2048
const ALLOWED_TYPES = new Set(['pdf', 'link'])

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.res

  const result = await loadStudyGuides()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  if (result.schemaMissing) {
    return NextResponse.json(
      { error: 'Study guides database is not initialized. Run supabase/schema.sql.', groups: [], classes: [] },
      { status: 503 }
    )
  }
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.res

  const ip = getClientIp(request)
  const perIp = rateLimit(`guides:${ip}`, 30, 60 * 60 * 1000)
  if (!perIp.allowed) return rateLimitResponse(perIp)

  const parsed = await readJson<{
    classId?: unknown
    title?: unknown
    type?: unknown
    url?: unknown
  }>(request, 8 * 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const { classId: rawClassId, title: rawTitle, type: rawType, url: rawUrl } = parsed.data

  const classId =
    typeof rawClassId === 'number' && Number.isInteger(rawClassId) && rawClassId > 0 && rawClassId < 1_000_000_000
      ? rawClassId
      : null
  const title = asTrimmedString(rawTitle, MAX_TITLE)
  const type = asTrimmedString(rawType, 10)
  const url = asTrimmedString(rawUrl, MAX_URL)

  if (!classId || !title || !type || !url) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  if (!isSafeHttpUrl(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('study_guides')
    .insert({ class_id: classId, title, type, url })
    .select('*, classes(name)')
    .single()

  if (error) {
    console.error('study-guides POST error', error)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
  return NextResponse.json({ guide: data })
}
