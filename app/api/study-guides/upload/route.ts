import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getClientIp, isSameOrigin, requireSession } from '@/lib/security'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME = 'application/pdf'
// %PDF-1.x — first 4 bytes of any well-formed PDF.
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] // "%PDF"

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
  if (
    buffer.length < 4 ||
    buffer[0] !== PDF_MAGIC[0] ||
    buffer[1] !== PDF_MAGIC[1] ||
    buffer[2] !== PDF_MAGIC[2] ||
    buffer[3] !== PDF_MAGIC[3]
  ) {
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
    console.error('upload error', error)
    return NextResponse.json({ error: 'Could not upload' }, { status: 500 })
  }

  const { data } = supabase.storage.from('study-guides').getPublicUrl(filename)
  return NextResponse.json({ url: data.publicUrl })
}
