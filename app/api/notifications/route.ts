import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  asTrimmedString,
  getClientIp,
  isSameOrigin,
  readJson,
  requireAuth,
} from '@/lib/security'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { deletePref, getPref, upsertPref } from '@/lib/notifications'

const MAX_EMAIL = 254 // RFC 5321

// Conservative email shape check. Avoids regex of doom — just looks for one @
// with non-empty local + domain parts and at least one dot in the domain.
function looksLikeEmail(s: string): boolean {
  if (s.length > MAX_EMAIL) return false
  const at = s.indexOf('@')
  if (at <= 0 || at !== s.lastIndexOf('@')) return false
  const local = s.slice(0, at)
  const domain = s.slice(at + 1)
  if (local.length === 0 || domain.length < 3) return false
  if (!domain.includes('.')) return false
  if (/[\s<>"'`]/.test(s)) return false
  return true
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn || !session.canvasUserId) {
    return NextResponse.json({ enabled: false, requiresCanvas: !session.canvasUserId })
  }
  const pref = await getPref(session.canvasUserId)
  if (!pref) return NextResponse.json({ enabled: false })
  return NextResponse.json({
    enabled: pref.alerts_enabled && !pref.paused_at,
    email: pref.email,
    paused: pref.paused_at !== null,
    pauseReason: pref.pause_reason,
  })
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.res

  const session = await getSession()
  if (!session.canvasUserId) {
    // Stored sessions from before canvasUserId was added — force re-login.
    return NextResponse.json(
      { error: 'Sign in again to enable notifications' },
      { status: 409 }
    )
  }

  const ip = getClientIp(request)
  const limit = rateLimit(`notif:${ip}`, 20, 60 * 60 * 1000)
  if (!limit.allowed) return rateLimitResponse(limit)

  const parsed = await readJson<{ email?: unknown }>(request, 4 * 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const email = asTrimmedString(parsed.data.email, MAX_EMAIL)
  if (!email || !looksLikeEmail(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const result = await upsertPref({
    canvasUserId: session.canvasUserId,
    email,
    canvasToken: auth.token,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const session = await getSession()
  if (!session.isLoggedIn || !session.canvasUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const ip = getClientIp(request)
  const limit = rateLimit(`notif-del:${ip}`, 20, 60 * 60 * 1000)
  if (!limit.allowed) return rateLimitResponse(limit)
  await deletePref(session.canvasUserId)
  return NextResponse.json({ ok: true })
}
