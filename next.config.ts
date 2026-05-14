import type { NextConfig } from "next";

// Content-Security-Policy is owned solely by proxy.ts, which is dev-aware
// (Turbopack HMR needs 'unsafe-eval' + ws: in dev, locked down in prod).
// Defining a second, divergent CSP here would make the browser enforce the
// *intersection* of both — silently overriding the dev-aware policy and
// making future edits to either file invisible. So CSP lives in one place.
//
// These headers stay here because next.config's `headers()` covers *static
// assets* too (JS/CSS chunks, the manifest), which proxy.ts's matcher
// deliberately excludes. CSP on a non-document asset response is inert, so
// nothing is lost by omitting it here.
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // Hide route handlers and pages from intermediate caches.
  { key: 'Cache-Control', value: 'private, no-store' },
]

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ]
  },
};

export default nextConfig;
