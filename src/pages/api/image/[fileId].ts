import type { APIRoute } from 'astro'
import { google } from 'googleapis'
import { head, put } from '@vercel/blob'
import sharp from 'sharp'
import { createKeyedCache, DEFAULT_TTL_MS } from '../../../lib/cache'
import { blobToken } from '../../../lib/blob'

const MAX_WIDTH = 1600

interface CachedImage {
  mimeType: string
  modifiedTime: string | null
  data: ArrayBuffer
}

interface StoredMeta {
  mimeType: string
  modifiedTime: string | null
}

const imagePath = (fileId: string) => `images/${fileId}`
const metaPath = (fileId: string) => `images/${fileId}.json`

function getDrive() {
  const key = import.meta.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set')
  const credentials = JSON.parse(key)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return google.drive({ version: 'v3', auth })
}

// meta blob's uploadedAt doubles as "last verified against Drive" timestamp
async function readStoredMeta(fileId: string) {
  const info = await head(metaPath(fileId), { token: blobToken }).catch(() => null)
  if (!info) return null
  const meta = (await fetch(info.url).then((r) => r.json())) as StoredMeta
  return { meta, uploadedAt: info.uploadedAt }
}

async function readStoredImage(fileId: string) {
  const info = await head(imagePath(fileId), { token: blobToken }).catch(() => null)
  if (!info) return null
  return fetch(info.url).then((r) => r.arrayBuffer())
}

async function storeImage(fileId: string, mimeType: string, modifiedTime: string | null, data: ArrayBuffer) {
  await Promise.all([
    put(imagePath(fileId), data, {
      access: 'public', contentType: mimeType, allowOverwrite: true, cacheControlMaxAge: DEFAULT_TTL_MS / 1000, token: blobToken,
    }),
    put(metaPath(fileId), JSON.stringify({ mimeType, modifiedTime }), {
      access: 'public', contentType: 'application/json', allowOverwrite: true, cacheControlMaxAge: DEFAULT_TTL_MS / 1000, token: blobToken,
    }),
  ])
}

// Persistence lives in Vercel Blob (survives cold starts/low traffic gaps, unlike the edge
// cache or in-memory cache), and is only re-verified against Drive every DEFAULT_TTL_MS.
const getImage = createKeyedCache<string, CachedImage>(async (fileId) => {
  const stored = await readStoredMeta(fileId)

  // durable copy was verified recently (by this or another instance) -> skip Drive entirely
  if (stored && Date.now() - stored.uploadedAt.getTime() < DEFAULT_TTL_MS) {
    const data = await readStoredImage(fileId)
    if (data) return { mimeType: stored.meta.mimeType, modifiedTime: stored.meta.modifiedTime, data }
  }

  const drive = getDrive()
  const meta = await drive.files.get({ fileId, fields: 'mimeType, modifiedTime' })
  const mimeType = meta.data.mimeType || 'image/jpeg'
  const modifiedTime = meta.data.modifiedTime ?? null

  // Drive file unchanged since the last download -> re-stamp the meta blob and reuse the stored bytes
  // (mimeType comes from the stored meta, not Drive, since the stored bytes are the resized webp version)
  if (stored && modifiedTime && modifiedTime === stored.meta.modifiedTime) {
    const data = await readStoredImage(fileId)
    if (data) {
      await put(metaPath(fileId), JSON.stringify(stored.meta), {
        access: 'public', contentType: 'application/json', allowOverwrite: true, cacheControlMaxAge: DEFAULT_TTL_MS / 1000, token: blobToken,
      })
      return { mimeType: stored.meta.mimeType, modifiedTime, data }
    }
  }

  // new or changed file -> download, normalize to webp at <=1600px wide, and persist for the next 15 minutes
  const response = (await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  )) as any
  const raw = response.data as ArrayBuffer

  let outMimeType = mimeType
  let data = raw
  try {
    const webp = await sharp(raw)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp()
      .toBuffer()
    data = webp.buffer.slice(webp.byteOffset, webp.byteOffset + webp.byteLength)
    outMimeType = 'image/webp'
  } catch (err) {
    console.warn('[image] webp conversion failed, storing original:', err)
  }

  await storeImage(fileId, outMimeType, modifiedTime, data)

  return { mimeType: outMimeType, modifiedTime, data }
})

export const GET: APIRoute = async ({ params }) => {
  const { fileId } = params
  if (!fileId) return new Response('Not found', { status: 404 })

  try {
    const image = await getImage(fileId)
    return new Response(image.data, {
      headers: {
        'Content-Type': image.mimeType,
        'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('[drive] image fetch failed:', err)
    return new Response('Not found', { status: 404 })
  }
}

