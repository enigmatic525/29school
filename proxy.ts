import { NextResponse, type NextRequest } from 'next/server'

// Apply security headers to every response. Kept narrow on purpose: this runs
// edge-fast and never touches the body, so it is safe to enable site-wide.

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-DNS-Prefetch-Control': 'off',
  'X-Permitted-Cross-Domain-Policies': 'none',
}

const PRIVATE_PATH_PREFIXES = ['/dashboard', '/edit', '/api']

export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value)
  }

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  // Authenticated/data-bearing pages: never cache. Prevents back-button leaks
  // after sign-out and stops shared caches from holding personal data.
  const path = request.nextUrl.pathname
  if (PRIVATE_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  }

  // Per-nonce CSP would be ideal, but Next.js inlines hydration scripts.
  // 'unsafe-inline' is required for Next; everything else is locked down.
  // The client makes no external fetch calls (all Canvas/Supabase calls are
  // server-side), so connect-src is limited to same-origin. unsafe-eval is
  // needed in dev (Turbopack HMR) but stripped in production.
  const isProd = process.env.NODE_ENV === 'production'
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    isProd ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    isProd ? "connect-src 'self'" : "connect-src 'self' https: wss:",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    'upgrade-insecure-requests',
  ].join('; ')
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  // Skip static assets and Next.js internals — headers are still applied to
  // every page + API response.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
