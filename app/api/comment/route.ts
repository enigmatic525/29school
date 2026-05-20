import { NextRequest, NextResponse } from 'next/server'
import { postSubmissionComment } from '@/lib/canvas'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import {
  asPositiveInt,
  asTrimmedString,
  getClientIp,
  isSameOrigin,
  readJson,
  requireAuth,
} from '@/lib/security'

const MAX_COMMENT = 5_000

// Posts a comment from the signed-in student onto their own submission for one
// assignment. Canvas scopes /submissions/self to the caller, so this can only
// ever write to the student's own work.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.res
  const token = auth.token

  // Token suffix (not the full token) keyed so the bucket never logs a credential.
  const tokenRl = rateLimit(`comment:${token.slice(-8)}`, 20, 60_000)
  if (!tokenRl.allowed) return rateLimitResponse(tokenRl)
  const ipRl = rateLimit(`comment-ip:${getClientIp(req)}`, 40, 60_000)
  if (!ipRl.allowed) return rateLimitResponse(ipRl)

  const parsed = await readJson<{
    courseId?: unknown
    assignmentId?: unknown
    text?: unknown
  }>(req, 32 * 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const courseId = asPositiveInt(parsed.data.courseId)
  const assignmentId = asPositiveInt(parsed.data.assignmentId)
  if (!courseId || !assignmentId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const text = asTrimmedString(parsed.data.text, MAX_COMMENT)
  if (!text) {
    return NextResponse.json({ error: 'Comment text required' }, { status: 400 })
  }

  await postSubmissionComment(token, courseId, assignmentId, text)
  return NextResponse.json({ ok: true })
}
