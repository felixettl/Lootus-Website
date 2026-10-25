import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

// Image and gallery endpoints proxy Google Drive with a service account. To keep them from
// serving arbitrary Drive files, every URL we render carries an HMAC of the Drive ID, so the
// endpoints only answer for IDs the server itself put on a page.

type Kind = 'image' | 'gallery' | 'contact'

let cachedSecret: { source: string; key: Buffer } | null = null

function signingKey(): Buffer | null {
  const source = process.env.URL_SIGNING_SECRET || process.env.GOOGLE_SERVICE_ACCOUNT_KEY
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

export function imageUrl(fileId: string): string {
  return `/api/image/${fileId}?s=${sign('image', fileId)}`
}

export function galleryUrl(folderId: string): string {
  return `/api/gallery/${folderId}?s=${sign('gallery', folderId)}`
}
