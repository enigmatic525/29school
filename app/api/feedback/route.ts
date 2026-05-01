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

// Lazy: constructing Resend at module load throws when RESEND_API_KEY is
// absent during Next's "Collecting page data" build step.
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const ALLOWED_CATEGORIES = new Set([
  'Workload / Assignment Clustering',
  'Academic Support',
  'School Culture',
  'Extracurriculars',
  'Communication',
  'Other',
])

const MAX_MESSAGE = 4000

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.res

  // 5 messages / 10 min per IP, plus a global 200 / 10 min cap so a botnet
  // can't bankrupt us via Resend.
  const ip = getClientIp(request)
  const perIp = rateLimit(`feedback:${ip}`, 5, 10 * 60 * 1000)
  if (!perIp.allowed) return rateLimitResponse(perIp)
  const global = rateLimit('feedback:global', 200, 10 * 60 * 1000)
  if (!global.allowed) return rateLimitResponse(global)

  const parsed = await readJson<{ category?: unknown; message?: unknown }>(request, 32 * 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const category = asTrimmedString(parsed.data.category, 100)
  const message = asTrimmedString(parsed.data.message, MAX_MESSAGE)
  if (!category || !ALLOWED_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  const safeCategory = escapeHtml(category)
  const safeMessage = escapeHtml(message)
  const subject = sanitizeHeader(`[Feedback] ${category}`, 150)

  const { error } = await getResend().emails.send({
    from: 'feedback@29.school',
    to: 'ahong@eastsideprep.org',
    subject,
    html: `
      <p><strong>Category:</strong> ${safeCategory}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap">${safeMessage}</p>
      <hr/>
      <p style="color:#888;font-size:12px">Submitted anonymously via 29.school</p>
    `,
  })

  if (error) {
    // Don't leak Resend internals to the client.
    return NextResponse.json({ error: 'Could not send' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
