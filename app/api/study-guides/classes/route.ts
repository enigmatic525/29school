import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  asTrimmedString,
  getClientIp,
  isSameOrigin,
  readJson,
  requireSession,
} from '@/lib/security'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const MAX_NAME = 100

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireSession()
  if (!auth.ok) return auth.res

  const ip = getClientIp(request)
  const perIp = rateLimit(`classes:${ip}`, 10, 60 * 60 * 1000)
  if (!perIp.allowed) return rateLimitResponse(perIp)

  const parsed = await readJson<{ name?: unknown }>(request, 2 * 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const name = asTrimmedString(parsed.data.name, MAX_NAME)
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('classes')
    .insert({ name })
    .select()
    .single()

  if (error) {
    console.error('classes POST error', error)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
  return NextResponse.json({ class: data })
}
