import { NextRequest, NextResponse } from 'next/server'
import { submitTextOrUrl, submitFileAssignment } from '@/lib/canvas'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import {
  asPositiveInt,
  asTrimmedString,
  getClientIp,
  isSafeHttpUrl,
  isSameOrigin,
  readJson,
  requireAuth,
} from '@/lib/security'

const MAX_TEXT = 100_000
const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB — Canvas accepts more, but cap our buffer to bound memory

export async function POST(req: NextRequest) {
  // CSRF: only allow same-origin POSTs. Auth cookie is sameSite=lax which
  // already blocks cross-site form submissions, but this is a belt-and-braces
  // check that also catches misconfigured proxies forwarding cross-origin.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireAuth()
  if (!auth.ok) return auth.res
  const token = auth.token

  // Per-token rate limit (using token suffix, not full token, to avoid logging
  // a credential into the bucket key).
  const tokenRl = rateLimit(`submit:${token.slice(-8)}`, 20, 60_000)
  if (!tokenRl.allowed) return rateLimitResponse(tokenRl)
  // Plus a per-IP cap so a single token can't be sprayed from a botnet.
  const ipRl = rateLimit(`submit-ip:${getClientIp(req)}`, 40, 60_000)
  if (!ipRl.allowed) return rateLimitResponse(ipRl)

  const contentType = (req.headers.get('content-type') ?? '').toLowerCase().split(';')[0]!.trim()

  if (contentType === 'multipart/form-data') {
    // File branch
    const declared = Number(req.headers.get('content-length') ?? '0')
    if (Number.isFinite(declared) && declared > MAX_FILE_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const courseId = asPositiveInt(formData.get('courseId'))
    const assignmentId = asPositiveInt(formData.get('assignmentId'))
    const file = formData.get('file')

    if (!courseId || !assignmentId || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }

    const safeName = asTrimmedString(file.name, 255) ?? 'upload'
    const buffer = await file.arrayBuffer()
    const result = await submitFileAssignment(token, courseId, assignmentId, {
      name: safeName,
      size: file.size,
      type: file.type || 'application/octet-stream',
      buffer,
    })
    return NextResponse.json(result)
  }

  // JSON branch — readJson enforces content-type, body size, and JSON shape.
  const parsed = await readJson<{
    courseId?: unknown
    assignmentId?: unknown
    submissionType?: unknown
    text?: unknown
    url?: unknown
  }>(req, 128 * 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const courseId = asPositiveInt(parsed.data.courseId)
  const assignmentId = asPositiveInt(parsed.data.assignmentId)
  const submissionType = parsed.data.submissionType
  if (!courseId || !assignmentId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (submissionType !== 'online_text_entry' && submissionType !== 'online_url') {
    return NextResponse.json({ error: 'Invalid submission type' }, { status: 400 })
  }

  if (submissionType === 'online_url') {
    if (!isSafeHttpUrl(parsed.data.url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    const result = await submitTextOrUrl(token, courseId, assignmentId, submissionType, {
      url: String(parsed.data.url),
    })
    return NextResponse.json(result)
  }

  const text = asTrimmedString(parsed.data.text, MAX_TEXT)
  if (!text) {
    return NextResponse.json({ error: 'Text required' }, { status: 400 })
  }
  const result = await submitTextOrUrl(token, courseId, assignmentId, submissionType, { body: text })
  return NextResponse.json(result)
}
