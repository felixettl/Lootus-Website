import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

// HMAC signatures for contact-form tokens and rate-limit keys.

type Kind = 'contact'

let cachedSecret: { source: string; key: Buffer } | null = null

function signingKey(): Buffer | null {
  const source = process.env.URL_SIGNING_SECRET || process.env.SMTP_PASSWORD
  if (!source) return null
  if (cachedSecret?.source !== source) {
    cachedSecret = { source, key: createHash('sha256').update(`lootus-url-signing:${source}`).digest() }
  }
  return cachedSecret.key
}

export function sign(kind: Kind, id: string): string {
  const key = signingKey()
  if (!key) return ''
  return createHmac('sha256', key).update(`${kind}:${id}`).digest('base64url').slice(0, 22)
}

export function verifySignature(kind: Kind, id: string, signature: string | null): boolean {
  const expected = sign(kind, id)
  if (!expected || !signature || signature.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
