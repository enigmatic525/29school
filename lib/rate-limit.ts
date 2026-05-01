import { NextResponse } from 'next/server'

// In-memory rate limiter. Per-process; for a single-instance Vercel function this
// is enough to slow scripted abuse. For multi-region deploys, swap for Upstash/KV.

interface Bucket {
  count: number
  resetAt: number
}

const BUCKETS = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

function now(): number {
  return Date.now()
}

// Opportunistic GC: when the map gets large, sweep expired entries.
function maybeGc(): void {
  if (BUCKETS.size < MAX_BUCKETS) return
  const t = now()
  for (const [key, bucket] of BUCKETS) {
    if (bucket.resetAt <= t) BUCKETS.delete(key)
  }
  // If still oversized, dump everything to bound memory.
  if (BUCKETS.size >= MAX_BUCKETS) BUCKETS.clear()
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  maybeGc()
  const t = now()
  const existing = BUCKETS.get(key)
  if (!existing || existing.resetAt <= t) {
    BUCKETS.set(key, { count: 1, resetAt: t + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) }
  }
  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - t) / 1000)),
    }
  }
  existing.count += 1
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: Math.ceil((existing.resetAt - t) / 1000),
  }
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    }
  )
}
