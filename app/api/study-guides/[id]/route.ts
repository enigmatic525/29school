import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getClientIp, isSameOrigin, requireSession } from '@/lib/security'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireSession()
  if (!auth.ok) return auth.res

  const ip = getClientIp(request)
  const perIp = rateLimit(`delete-guide:${ip}`, 20, 60 * 60 * 1000)
  if (!perIp.allowed) return rateLimitResponse(perIp)

  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (!Number.isInteger(id) || id <= 0 || id >= 1_000_000_000) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const { error } = await supabase.from('study_guides').delete().eq('id', id)

  if (error) {
    console.error('study-guides DELETE error', error)
    return NextResponse.json({ error: 'Could not delete' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
