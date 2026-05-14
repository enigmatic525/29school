import { NextRequest, NextResponse } from 'next/server'
import { fetchSubmissionDetail } from '@/lib/canvas'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { asPositiveInt, getClientIp, isSameOrigin, requireAuth } from '@/lib/security'

// Returns the signed-in student's own submission for one assignment, plus the
// assignment's rubric. Canvas scopes /submissions/self to the caller, so this
// route cannot be used to read another student's work — id guessing just
// yields a 404.
export async function GET(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.res
  const token = auth.token

  const tokenRl = rateLimit(`submission:${token.slice(-8)}`, 60, 60_000)
  if (!tokenRl.allowed) return rateLimitResponse(tokenRl)
  const ipRl = rateLimit(`submission-ip:${getClientIp(req)}`, 120, 60_000)
  if (!ipRl.allowed) return rateLimitResponse(ipRl)

  const courseId = asPositiveInt(req.nextUrl.searchParams.get('courseId'))
  const assignmentId = asPositiveInt(req.nextUrl.searchParams.get('assignmentId'))
  if (!courseId || !assignmentId) {
    return NextResponse.json({ error: 'Missing courseId or assignmentId' }, { status: 400 })
  }

  const detail = await fetchSubmissionDetail(token, courseId, assignmentId)
  if (!detail) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(detail)
}
