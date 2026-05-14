import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { fetchCourses, fetchRecentSubmissions } from '@/lib/canvas'
import { listEnabledPrefs, markPaused, updateLastSeen } from '@/lib/notifications'
import { sendGradeAlert, sendPausedNotice } from '@/lib/email'

// Vercel Cron hits this on schedule (configured in vercel.json) using GET
// with the bearer token from CRON_SECRET. We additionally allow POST so
// curl-based smoke tests work without method tricks.
//
// On Vercel hobby tier, cron frequency is limited to once per day. Adjust
// the schedule in vercel.json if you're not on Pro.

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // seconds — cron handlers may run longer than the default page TTL

const CANVAS_DOMAIN = process.env.CANVAS_DOMAIN

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected || expected.length < 16) return false
  const got = request.headers.get('authorization') ?? ''
  const m = /^Bearer\s+(.+)$/i.exec(got)
  if (!m) return false
  const provided = m[1]!
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

interface CanvasProbeResult {
  ok: boolean
  invalid: boolean // distinguishes 401 from transient errors
}

async function probeCanvasToken(token: string): Promise<CanvasProbeResult> {
  try {
    const res = await fetch(`https://${CANVAS_DOMAIN}/api/v1/users/self/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) return { ok: true, invalid: false }
    if (res.status === 401 || res.status === 403) return { ok: false, invalid: true }
    return { ok: false, invalid: false }
  } catch {
    return { ok: false, invalid: false }
  }
}

async function handle(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!CANVAS_DOMAIN) {
    return NextResponse.json({ error: 'CANVAS_DOMAIN not configured' }, { status: 500 })
  }

  const prefs = await listEnabledPrefs()
  let processed = 0
  let sent = 0
  let paused = 0
  let skipped = 0

  for (const pref of prefs) {
    processed += 1
    const probe = await probeCanvasToken(pref.canvasToken)
    if (!probe.ok) {
      if (probe.invalid) {
        await markPaused(pref.canvas_user_id, 'token_invalid')
        // Tell the user their alerts stopped — best-effort, must never break
        // the run for the remaining users.
        try {
          await sendPausedNotice(pref.email)
        } catch (e) {
          console.error(`sendPausedNotice failed for ${pref.canvas_user_id}:`, (e as Error).message)
        }
        paused += 1
      } else {
        skipped += 1
      }
      continue
    }

    const lastSeenMs = new Date(pref.last_grade_seen_at).getTime()
    if (!Number.isFinite(lastSeenMs)) {
      skipped += 1
      continue
    }

    let courses
    try {
      courses = await fetchCourses(pref.canvasToken)
    } catch {
      skipped += 1
      continue
    }

    const submissions = await fetchRecentSubmissions(pref.canvasToken, courses)
    const fresh = submissions.filter((s) => {
      const t = new Date(s.gradedAt).getTime()
      return Number.isFinite(t) && t > lastSeenMs
    })

    if (fresh.length === 0) continue

    // Cap email size — if a teacher just bulk-graded 200 things we don't
    // want to ship a 500 KB email. Show 25 and add a note.
    const MAX_PER_EMAIL = 25
    const slice = fresh.slice(0, MAX_PER_EMAIL)
    const result = await sendGradeAlert({ to: pref.email, grades: slice })
    if (!result.ok) {
      // Resend rejected — leave last_grade_seen_at untouched so we retry
      // next run. Log and move on.
      console.error(`grade-alert send failed for ${pref.canvas_user_id}: ${result.error}`)
      skipped += 1
      continue
    }

    sent += 1
    const newest = fresh.reduce((max, s) => {
      const t = new Date(s.gradedAt).getTime()
      return Number.isFinite(t) && t > max ? t : max
    }, lastSeenMs)
    await updateLastSeen(pref.canvas_user_id, new Date(newest).toISOString())
  }

  return NextResponse.json({ processed, sent, paused, skipped })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
