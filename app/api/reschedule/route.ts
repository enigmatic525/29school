import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import {
  asTrimmedString,
  escapeHtml,
  getClientIp,
  isSameOrigin,
  readJson,
  requireAuth,
  sanitizeHeader,
} from '@/lib/security'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY!)

const MAX_ASSIGNMENTS = 100

interface AssignmentPayload {
  name?: unknown
  due_at?: unknown
  courseCode?: unknown
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.res

  const ip = getClientIp(request)
  const perIp = rateLimit(`reschedule:${ip}`, 3, 60 * 60 * 1000)
  if (!perIp.allowed) return rateLimitResponse(perIp)
  const global = rateLimit('reschedule:global', 100, 60 * 60 * 1000)
  if (!global.allowed) return rateLimitResponse(global)

  const parsed = await readJson<{
    week?: unknown
    score?: unknown
    assignments?: unknown
  }>(request, 64 * 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const week = asTrimmedString(parsed.data.week, 100)
  if (!week) return NextResponse.json({ error: 'Week required' }, { status: 400 })

  const rawScore = parsed.data.score
  const score = typeof rawScore === 'number' && Number.isFinite(rawScore) && rawScore >= 0 && rawScore < 10_000
    ? Math.floor(rawScore)
    : 0

  const rawAssignments = Array.isArray(parsed.data.assignments) ? parsed.data.assignments : []
  if (rawAssignments.length > MAX_ASSIGNMENTS) {
    return NextResponse.json({ error: 'Too many assignments' }, { status: 400 })
  }

  const rows = rawAssignments
    .slice(0, MAX_ASSIGNMENTS)
    .map((raw) => {
      const a = (raw ?? {}) as AssignmentPayload
      const name = asTrimmedString(a.name, 300) ?? '(untitled)'
      const courseCode = asTrimmedString(a.courseCode, 50) ?? ''
      const dueRaw = typeof a.due_at === 'string' ? a.due_at : ''
      const dueDate = new Date(dueRaw)
      const due = isNaN(dueDate.getTime())
        ? 'unknown date'
        : dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      return `<li>${escapeHtml(courseCode)}: ${escapeHtml(name)} — due ${escapeHtml(due)}</li>`
    })
    .join('')

  const subject = sanitizeHeader(`[Reschedule Request] ${week}`, 150)

  const { error } = await resend.emails.send({
    from: 'feedback@29.school',
    to: 'ahong@eastsideprep.org',
    subject,
    html: `
      <p>A student has requested rescheduling for the week of <strong>${escapeHtml(week)}</strong> (workload score: ${score}).</p>
      <p><strong>Assignments due this week:</strong></p>
      <ul>${rows}</ul>
      <hr/>
      <p style="color:#888;font-size:12px">Sent via 29.school workload calendar</p>
    `,
  })

  if (error) return NextResponse.json({ error: 'Could not send' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
