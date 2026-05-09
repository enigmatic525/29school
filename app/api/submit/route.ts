import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { submitTextOrUrl, submitFileAssignment } from '@/lib/canvas'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn || !session.canvasToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const rl = rateLimit(`submit:${session.canvasToken.slice(-8)}`, 20, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl)

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const courseId = Number(formData.get('courseId'))
    const assignmentId = Number(formData.get('assignmentId'))
    const file = formData.get('file') as File | null

    if (!courseId || !assignmentId || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const result = await submitFileAssignment(session.canvasToken, courseId, assignmentId, {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      buffer,
    })
    return NextResponse.json(result)
  }

  const body = await req.json()
  const { courseId, assignmentId, submissionType, text, url } = body

  if (!courseId || !assignmentId || !submissionType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['online_text_entry', 'online_url'].includes(submissionType)) {
    return NextResponse.json({ error: 'Invalid submission type' }, { status: 400 })
  }

  const result = await submitTextOrUrl(
    session.canvasToken,
    courseId,
    assignmentId,
    submissionType,
    submissionType === 'online_url' ? { url } : { body: text }
  )
  return NextResponse.json(result)
}
