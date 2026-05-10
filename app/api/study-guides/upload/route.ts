import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getClientIp, isSameOrigin, requireSession } from '@/lib/security'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME = 'application/pdf'
// %PDF-1. — well-formed PDFs start with the magic plus a version byte.
// Requiring the version byte rejects polyglots that splice "%PDF" onto HTML.
const PDF_HEADER = Buffer.from('%PDF-1.', 'utf8')
// %%EOF — every conformant PDF ends with this marker (possibly followed by
// whitespace). Checking the trailer further narrows what passes.
const PDF_TRAILER = Buffer.from('%%EOF', 'utf8')

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = await requireSession()
  if (!auth.ok) return auth.res

  const ip = getClientIp(request)
  const perIp = rateLimit(`upload:${ip}`, 10, 60 * 60 * 1000)
  if (!perIp.allowed) return rateLimitResponse(perIp)
  const global = rateLimit('upload:global', 200, 60 * 60 * 1000)
  if (!global.allowed) return rateLimitResponse(global)

  // Reject obviously oversized uploads before consuming the body.
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }
  if (file.type !== ALLOWED_MIME) {
    return NextResponse.json({ error: 'Only PDF allowed' }, { status: 415 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  // Re-check size after read in case Content-Length lied.
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }
  // Magic-number sniff so a renamed exe / html / svg can't pose as a PDF.
  // Header must be %PDF-1. and the file must contain %%EOF in its tail
  // window — narrows the polyglot surface a friend might try to upload.
  if (buffer.length < PDF_HEADER.length + PDF_TRAILER.length) {
    return NextResponse.json({ error: 'Not a valid PDF' }, { status: 415 })
  }
  if (buffer.subarray(0, PDF_HEADER.length).compare(PDF_HEADER) !== 0) {
    return NextResponse.json({ error: 'Not a valid PDF' }, { status: 415 })
  }
  // PDF readers tolerate junk after %%EOF; check the last 1 KB for the trailer.
  const tail = buffer.subarray(Math.max(0, buffer.length - 1024))
  if (tail.indexOf(PDF_TRAILER) === -1) {
    return NextResponse.json({ error: 'Not a valid PDF' }, { status: 415 })
  }

  // Server-generated, opaque filename — drop any user-supplied name to
  // eliminate path-traversal and content-sniffing tricks.
  const random = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const filename = `${random}.pdf`

  const { error } = await supabase.storage
    .from('study-guides')
    .upload(filename, buffer, {
      contentType: ALLOWED_MIME,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('upload error:', error.message)
    return NextResponse.json({ error: 'Could not upload' }, { status: 500 })
  }

  const { data } = supabase.storage.from('study-guides').getPublicUrl(filename)
  return NextResponse.json({ url: data.publicUrl })
}
