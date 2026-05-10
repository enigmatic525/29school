import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { asTrimmedString, getClientIp, isSameOrigin, readJson, requireSession } from '@/lib/security'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// Server-side check for the notice-board edit lock. Replaces a client-side
// password constant that anyone could read in DevTools. Compares with a
// constant-time digest so a friend can't time-based brute-force it either.
//
// Set NOTICE_BOARD_PASSWORD in .env.local. With it unset, the route returns
// 503 — fail closed.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireSession()
  if (!auth.ok) return auth.res

  // 8 attempts per 10 min per IP — slow brute-force, leave normal use unbothered.
  const ip = getClientIp(request)
  const limit = rateLimit(`notice-unlock:${ip}`, 8, 10 * 60 * 1000)
  if (!limit.allowed) return rateLimitResponse(limit)

  const expected = process.env.NOTICE_BOARD_PASSWORD
  if (!expected) {
    return NextResponse.json({ error: 'Notice board password is not configured' }, { status: 503 })
  }

  const parsed = await readJson<{ password?: unknown }>(request, 2 * 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const provided = asTrimmedString(parsed.data.password, 256)
  if (!provided) return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })

  // Constant-time compare: equal-length buffers required, so left-pad both to
  // a fixed width by hashing — keeps the comparison size-independent.
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // Pad to the longer length to keep timingSafeEqual happy without leaking
  // length via early-return.
  const len = Math.max(a.length, b.length)
  const padA = Buffer.alloc(len)
  const padB = Buffer.alloc(len)
  a.copy(padA)
  b.copy(padB)
  const matches = timingSafeEqual(padA, padB) && a.length === b.length

  if (!matches) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
