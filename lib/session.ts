import { getIronSession, type IronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  canvasToken?: string
  isLoggedIn?: boolean
}

const password = process.env.SESSION_SECRET
if (!password || password.length < 32) {
  // Fail loud at boot if the secret is missing or too short to defeat brute-force.
  throw new Error('SESSION_SECRET must be set to at least 32 characters')
}

const sessionOptions = {
  password,
  cookieName: '29school',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions)
}
