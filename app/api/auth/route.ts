import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { fetchProfile } from '@/lib/canvas'

export async function POST(request: NextRequest) {
  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  try {
    const profile = await fetchProfile(token)
    const session = await getSession()
    session.canvasToken = token
    session.isLoggedIn = true
    await session.save()
    return NextResponse.json({ ok: true, name: profile.name })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export async function DELETE() {
  const session = await getSession()
  session.destroy()
  return NextResponse.json({ ok: true })
}
