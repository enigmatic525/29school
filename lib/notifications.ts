import 'server-only'
import { supabase } from './supabase'
import { encryptToken, decryptToken } from './crypto'

export interface NotificationPref {
  canvas_user_id: number
  email: string
  alerts_enabled: boolean
  last_grade_seen_at: string
  paused_at: string | null
  pause_reason: string | null
}

interface PrefRow extends NotificationPref {
  token_ciphertext: string
}

export async function getPref(canvasUserId: number): Promise<NotificationPref | null> {
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('canvas_user_id, email, alerts_enabled, last_grade_seen_at, paused_at, pause_reason')
    .eq('canvas_user_id', canvasUserId)
    .maybeSingle()
  if (error) {
    console.error('getPref error:', error.message)
    return null
  }
  return (data as NotificationPref | null) ?? null
}

export async function upsertPref(args: {
  canvasUserId: number
  email: string
  canvasToken: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const tokenCiphertext = encryptToken(args.canvasToken)
  const { error } = await supabase.from('notification_prefs').upsert(
    {
      canvas_user_id: args.canvasUserId,
      email: args.email,
      token_ciphertext: tokenCiphertext,
      alerts_enabled: true,
      paused_at: null,
      pause_reason: null,
      // last_grade_seen_at is preserved on conflict by default — only set on
      // initial insert. We pass it here so first-time inserts begin "now"
      // rather than 1970, which would email every grade ever.
      last_grade_seen_at: new Date().toISOString(),
    },
    { onConflict: 'canvas_user_id', ignoreDuplicates: false }
  )
  if (error) {
    console.error('upsertPref error:', error.message)
    return { ok: false, error: 'Could not save preferences' }
  }
  return { ok: true }
}

export async function refreshStoredToken(canvasUserId: number, canvasToken: string): Promise<void> {
  const tokenCiphertext = encryptToken(canvasToken)
  const { error } = await supabase
    .from('notification_prefs')
    .update({ token_ciphertext: tokenCiphertext, paused_at: null, pause_reason: null })
    .eq('canvas_user_id', canvasUserId)
  if (error) console.error('refreshStoredToken error:', error.message)
}

export async function deletePref(canvasUserId: number): Promise<void> {
  const { error } = await supabase
    .from('notification_prefs')
    .delete()
    .eq('canvas_user_id', canvasUserId)
  if (error) console.error('deletePref error:', error.message)
}

export interface EnabledPrefWithToken extends NotificationPref {
  canvasToken: string
}

export async function listEnabledPrefs(): Promise<EnabledPrefWithToken[]> {
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('canvas_user_id, email, token_ciphertext, alerts_enabled, last_grade_seen_at, paused_at, pause_reason')
    .eq('alerts_enabled', true)
    .is('paused_at', null)
  if (error) {
    console.error('listEnabledPrefs error:', error.message)
    return []
  }
  if (!Array.isArray(data)) return []
  const out: EnabledPrefWithToken[] = []
  for (const row of data as PrefRow[]) {
    try {
      out.push({
        canvas_user_id: row.canvas_user_id,
        email: row.email,
        alerts_enabled: row.alerts_enabled,
        last_grade_seen_at: row.last_grade_seen_at,
        paused_at: row.paused_at,
        pause_reason: row.pause_reason,
        canvasToken: decryptToken(row.token_ciphertext),
      })
    } catch (e) {
      // A row whose ciphertext can't be decrypted (e.g., SESSION_SECRET was
      // rotated) is unusable; skip rather than crash the whole cron run.
      console.error(`decrypt failed for canvas_user_id=${row.canvas_user_id}:`, (e as Error).message)
    }
  }
  return out
}

export async function markPaused(canvasUserId: number, reason: string): Promise<void> {
  const { error } = await supabase
    .from('notification_prefs')
    .update({ paused_at: new Date().toISOString(), pause_reason: reason })
    .eq('canvas_user_id', canvasUserId)
  if (error) console.error('markPaused error:', error.message)
}

export async function updateLastSeen(canvasUserId: number, isoTimestamp: string): Promise<void> {
  const { error } = await supabase
    .from('notification_prefs')
    .update({ last_grade_seen_at: isoTimestamp })
    .eq('canvas_user_id', canvasUserId)
  if (error) console.error('updateLastSeen error:', error.message)
}
