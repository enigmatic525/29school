import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getClientIp, isSameOrigin } from '@/lib/security'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getPref } from '@/lib/notifications'
import { sendTestEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const session = await getSession()
  if (!session.isLoggedIn || !session.canvasUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Tight cap — don't let anyone use this to send arbitrary mail through us.
  const ip = getClientIp(request)
  const limit = rateLimit(`notif-test:${ip}`, 5, 60 * 60 * 1000)
  if (!limit.allowed) return rateLimitResponse(limit)

  const pref = await getPref(session.canvasUserId)
  if (!pref) {
    return NextResponse.json({ error: 'Enable alerts first' }, { status: 400 })
  }

  const result = await sendTestEmail(pref.email)
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
