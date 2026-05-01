'use client'

import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function signOut() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={signOut}
      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      Sign out
    </button>
  )
}
