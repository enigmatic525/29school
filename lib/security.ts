import 'server-only'
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
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase().split(';')[0]!.trim()
  if (contentType !== 'application/json') {
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

// ---------- Numeric validation ----------

export function asPositiveInt(value: unknown, max: number = Number.MAX_SAFE_INTEGER): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null
  if (n < 1 || n > max) return null
  return n
}

// ---------- HTML sanitisation (allowlist) ----------

// Defense-in-depth for teacher-authored Canvas HTML rendered via
// dangerouslySetInnerHTML. Allowlists tags and attributes, drops event
// handlers and dangerous URL schemes. Not a replacement for trust in the
// upstream source — but neutralises a compromised teacher account or a
// Canvas content bug from leading to script execution in our origin.

const HTML_ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'span', 'div', 'a', 'b', 'i', 'em', 'strong', 'u', 'small', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption',
])

const HTML_VOID_TAGS = new Set(['br', 'hr', 'img'])

const HTML_GLOBAL_ATTRS = new Set(['class', 'id', 'title'])

const HTML_TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'rel', 'target']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
}

// Decode &#x6A;avascript: style entity-encoded URL prefixes so the scheme
// check below can't be bypassed.
function decodeEntities(s: string): string {
  return s.replace(/&(?:#x([0-9a-fA-F]+)|#(\d+)|([a-zA-Z]+));?/g, (full, hex, dec, named) => {
    if (hex) {
      const cp = parseInt(hex, 16)
      return Number.isFinite(cp) && cp > 0 && cp < 0x110000 ? String.fromCodePoint(cp) : ''
    }
    if (dec) {
      const cp = parseInt(dec, 10)
      return Number.isFinite(cp) && cp > 0 && cp < 0x110000 ? String.fromCodePoint(cp) : ''
    }
    if (named === 'amp') return '&'
    if (named === 'lt') return '<'
    if (named === 'gt') return '>'
    if (named === 'quot') return '"'
    if (named === 'apos') return "'"
    return full
  })
}

function isSafeAttrUrl(raw: string): boolean {
  const decoded = decodeEntities(raw).trim().toLowerCase().replace(/[\s\x00-\x1F\x7F]/g, '')
  if (!decoded) return false
  if (
    decoded.startsWith('javascript:') ||
    decoded.startsWith('vbscript:') ||
    decoded.startsWith('data:') ||
    decoded.startsWith('file:')
  ) return false
  return true
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\x00-\x1F\x7F]/g, '')
}

function sanitizeAttrs(tag: string, raw: string): string {
  const out: string[] = []
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`<>]+)))?/g
  const allowedForTag = HTML_TAG_ATTRS[tag]
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(raw))) {
    const name = m[1]!.toLowerCase()
    const val = m[2] ?? m[3] ?? m[4] ?? ''
    if (name.startsWith('on')) continue
    if (name === 'style') continue
    if (name === 'srcset' || name === 'formaction' || name === 'xmlns' || name === 'xlink:href') continue
    const allowed = HTML_GLOBAL_ATTRS.has(name) || (allowedForTag && allowedForTag.has(name))
    if (!allowed) continue
    if ((name === 'href' || name === 'src') && !isSafeAttrUrl(val)) continue
    if (name === 'target' && val !== '_blank') continue
    out.push(`${name}="${escapeAttr(val)}"`)
  }
  if (tag === 'a' && out.some((a) => a.startsWith('target='))) {
    if (!out.some((a) => a.startsWith('rel='))) out.push('rel="noopener noreferrer"')
  }
  return out.length ? ' ' + out.join(' ') : ''
}

export function sanitizeHtml(input: string | null | undefined, maxLength = 200_000): string {
  if (!input) return ''
  let s = String(input).slice(0, maxLength)
  // Strip dangerous block tags including their full content.
  s = s.replace(
    /<\s*(script|style|iframe|object|embed|noscript|template|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ''
  )
  // Strip self-closing or void variants of those + structural attack tags.
  s = s.replace(
    /<\s*\/?\s*(script|style|iframe|object|embed|noscript|template|svg|math|link|meta|form|input|button|base)\b[^>]*\/?>/gi,
    ''
  )
  // Strip HTML/CDATA comments — they can hide payloads from the tag walker.
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
  // Walk remaining tags through the allowlist.
  s = s.replace(/<(\/)?\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_full, slash, rawTag, rawAttrs) => {
    const tag = String(rawTag).toLowerCase()
    if (!HTML_ALLOWED_TAGS.has(tag)) return ''
    if (slash) return `</${tag}>`
    const attrs = sanitizeAttrs(tag, rawAttrs)
    return HTML_VOID_TAGS.has(tag) ? `<${tag}${attrs} />` : `<${tag}${attrs}>`
  })
  return s
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

// ---------- Client IP extraction (best-effort, used for rate limiting only) ----------

export function getClientIp(request: NextRequest): string {
  // x-real-ip is set by Vercel's edge and cannot be spoofed by the client.
  // x-forwarded-for[0] is the leftmost entry and CAN be spoofed (client can
  // prepend anything before the request reaches the proxy), so we only fall
  // back to it and take the rightmost entry that the trusted proxy appended.
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) {
    // Take the last entry — added by the outermost trusted proxy.
    const entries = fwd.split(',')
    return entries[entries.length - 1]!.trim()
  }
  return 'unknown'
}
