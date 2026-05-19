import 'server-only'
import { getIronSession, type IronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  canvasToken?: string
  isLoggedIn?: boolean
  // True when the user opted into "use without token" mode. They have a
  // session but no Canvas access, so the workload dashboard is unavailable.
  guest?: boolean
  // Stable Canvas user id captured at login. Needed so the notification
  // settings can key prefs by a stable identifier (the token rotates).
  canvasUserId?: number
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
