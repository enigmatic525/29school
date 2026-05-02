import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { fetchProfile } from '@/lib/canvas'
import { asTrimmedString, getClientIp, isSameOrigin, readJson } from '@/lib/security'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// Generic auth error so token-shape mismatches do not give bots a faster signal.
const AUTH_ERROR = NextResponse.json({ error: 'Invalid token' }, { status: 401 })

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Brute-force defense: 8 login attempts per IP per 15 minutes.
  const ip = getClientIp(request)
  const limit = rateLimit(`auth:${ip}`, 8, 15 * 60 * 1000)
  if (!limit.allowed) return rateLimitResponse(limit)

  const parsed = await readJson<{ token?: unknown; guest?: unknown }>(request, 4 * 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  // Guest sign-in: no Canvas token, limited features.
  if (parsed.data.guest === true) {
    const session = await getSession()
    session.canvasToken = undefined
    session.isLoggedIn = true
    session.guest = true
    await session.save()
    return NextResponse.json({ ok: true, guest: true })
  }

  const token = asTrimmedString(parsed.data.token, 200)
  if (!token) return AUTH_ERROR
  // Canvas tokens are opaque, but reasonable bound + charset narrows to
  // the printable subset and rejects header-injection payloads.
  if (!/^[A-Za-z0-9~._-]+$/.test(token)) return AUTH_ERROR

  try {
    const profile = await fetchProfile(token)
    const session = await getSession()
    session.canvasToken = token
    session.isLoggedIn = true
    session.guest = false
    await session.save()
    return NextResponse.json({ ok: true, name: profile.name })
  } catch {
    return AUTH_ERROR
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const session = await getSession()
  session.destroy()
  return NextResponse.json({ ok: true })
}
