import { NextRequest, NextResponse } from 'next/server'
import { fetchCourseGradeBreakdown } from '@/lib/canvas'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { asPositiveInt, getClientIp, isSameOrigin, requireAuth } from '@/lib/security'

export async function GET(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.res
  const token = auth.token

  const tokenRl = rateLimit(`grade-breakdown:${token.slice(-8)}`, 30, 60_000)
  if (!tokenRl.allowed) return rateLimitResponse(tokenRl)
  const ipRl = rateLimit(`grade-breakdown-ip:${getClientIp(req)}`, 60, 60_000)
  if (!ipRl.allowed) return rateLimitResponse(ipRl)

  const courseId = asPositiveInt(req.nextUrl.searchParams.get('courseId'))
  if (!courseId) {
    return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })
  }
  const useWeightsParam = req.nextUrl.searchParams.get('useWeights')
  const useWeightsHint = useWeightsParam === '1' ? true : useWeightsParam === '0' ? false : undefined

  const breakdown = await fetchCourseGradeBreakdown(token, courseId, useWeightsHint)
  if (!breakdown) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // Private cache: same user reopening within 2 minutes gets it for free.
  return NextResponse.json(breakdown, {
    headers: { 'Cache-Control': 'private, max-age=120' },
  })
}
