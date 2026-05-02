import { NextRequest, NextResponse } from 'next/server'
import { getSession } from './session'

// ---------- HTML escape (for content interpolated into outgoing emails) ----------

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
  '/': '&#47;',
}

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return ''
  return String(input).replace(/[&<>"'`/]/g, (ch) => HTML_ESCAPE[ch])
}

// ---------- Header / subject sanitisation (control-char strip for email headers) ----------

// Stateless `.test()` — fresh regex each call to avoid lastIndex pitfalls.
function hasControlChar(s: string): boolean {
  return new RegExp('[\\x00-\\x1F\\x7F]').test(s)
}

export function sanitizeHeader(input: unknown, max = 200): string {
  return String(input ?? '')
    .replace(new RegExp('[\\x00-\\x1F\\x7F]+', 'g'), ' ')
    .slice(0, max)
    .trim()
}

// ---------- URL safety: reject javascript:/data:/vbscript:/file: links ----------

export function isSafeHttpUrl(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > 2048) return false
  // Reject control chars (incl. CRLF/tab) used to bypass scheme parsing.
  if (hasControlChar(trimmed)) return false
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}

// ---------- Origin / CSRF check on state-changing requests ----------

export function isSameOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  if (!host) return false

  const candidate = origin ?? referer
  if (!candidate) return false
  try {
    const u = new URL(candidate)
    return u.host === host
  } catch {
    return false
  }
}

// ---------- Body-size-limited JSON parser ----------

export async function readJson<T = unknown>(
  request: NextRequest,
  maxBytes = 16 * 1024
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, status: 413, error: 'Payload too large' }
  }
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase()
  if (!contentType.includes('application/json')) {
    return { ok: false, status: 415, error: 'Unsupported content type' }
  }
  let text: string
  try {
    text = await request.text()
  } catch {
    return { ok: false, status: 400, error: 'Invalid body' }
  }
  if (text.length > maxBytes) {
    return { ok: false, status: 413, error: 'Payload too large' }
  }
  let data: unknown
  try {
    data = text.length === 0 ? {} : JSON.parse(text)
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' }
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, status: 400, error: 'Invalid JSON shape' }
  }
  return { ok: true, data: data as T }
}

// ---------- String validation ----------

export function asTrimmedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > max) return null
  return trimmed
}

// ---------- Auth guards ----------

// Strict: requires a Canvas token. Use for endpoints that call Canvas.
export async function requireAuth(): Promise<{ ok: true; token: string } | { ok: false; res: NextResponse }> {
  const session = await getSession()
  if (!session.isLoggedIn || !session.canvasToken) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { ok: true, token: session.canvasToken }
}

// Permissive: any logged-in session, including guest (no Canvas token).
// Use for features that work without Canvas (feedback, study guides).
export async function requireSession(): Promise<
  | { ok: true; token: string | null; guest: boolean }
  | { ok: false; res: NextResponse }
> {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { ok: true, token: session.canvasToken ?? null, guest: !!session.guest }
}

// ---------- Client IP extraction (best-effort, used for rate limiting only) ----------

export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
