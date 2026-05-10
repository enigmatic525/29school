import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// AES-256-GCM at-rest encryption for Canvas tokens stored in
// notification_prefs.token_ciphertext. The key is derived from
// SESSION_SECRET via SHA-256 with a domain-separation tag, so a leak of
// the cookie session secret does not give cross-purpose key reuse beyond
// what's already implied. Rotating SESSION_SECRET invalidates all stored
// tokens (users will re-enable on next login).

const KEY_DOMAIN = 'notif-token-v1'
const ALG = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters')
  }
  return createHash('sha256').update(`${secret}:${KEY_DOMAIN}`).digest()
}

export function encryptToken(plaintext: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('encryptToken: empty plaintext')
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, getKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Stored as iv.tag.ciphertext, all base64. The auth tag is integrity-checked
  // on decrypt, so bit-flips in the DB row cause a clean failure rather than
  // returning garbage.
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.')
}

export function decryptToken(blob: string): string {
  if (typeof blob !== 'string') throw new Error('decryptToken: not a string')
  const parts = blob.split('.')
  if (parts.length !== 3) throw new Error('decryptToken: malformed ciphertext')
  const [ivB64, tagB64, ctB64] = parts as [string, string, string]
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error('decryptToken: invalid iv or tag length')
  }
  const dec = createDecipheriv(ALG, getKey(), iv)
  dec.setAuthTag(tag)
  return Buffer.concat([dec.update(ct), dec.final()]).toString('utf8')
}
