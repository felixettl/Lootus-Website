import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { APIRoute } from 'astro'
import { google } from 'googleapis'
import sharp from 'sharp'
import { createKeyedCache, DEFAULT_TTL_MS } from '../../../lib/cache'
import { assertDriveId, cacheRoot } from '../../../lib/file-cache'
import { parseServiceAccountKey } from '../../../lib/google-credentials'
import { verifySignature } from '../../../lib/signed-urls'

const imageCacheDir = path.join(cacheRoot, 'images')
const MAX_WIDTH = 1600
const MAX_SOURCE_BYTES = 40 * 1024 * 1024

interface CachedImage {
  data: ArrayBuffer
  modifiedTime: string | null
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return Uint8Array.from(data).buffer
}

async function readCachedImage(fileId: string) {
  const imagePath = path.join(imageCacheDir, `${fileId}.webp`)
  const metaPath = path.join(imageCacheDir, `${fileId}.json`)
  try {
    const [data, meta, info] = await Promise.all([
      readFile(imagePath),
      readFile(metaPath, 'utf8').then((value) => JSON.parse(value) as { modifiedTime: string | null }),
      stat(metaPath),
    ])
    return { data: toArrayBuffer(data), modifiedTime: meta.modifiedTime, updatedAt: info.mtimeMs }
  } catch {
    return null
  }
}

function getDrive() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set')
  const auth = new google.auth.GoogleAuth({
    credentials: parseServiceAccountKey(key),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return google.drive({ version: 'v3', auth })
}

const getImage = createKeyedCache<string, CachedImage>(async (unsafeFileId) => {
  const fileId = assertDriveId(unsafeFileId)
  const cached = await readCachedImage(fileId)
  if (cached && Date.now() - cached.updatedAt < DEFAULT_TTL_MS) return cached

  try {
    const drive = getDrive()
    const meta = await drive.files.get({ fileId, fields: 'modifiedTime, mimeType, size' })
    const modifiedTime = meta.data.modifiedTime ?? null
    if (!meta.data.mimeType?.startsWith('image/')) throw new Error(`Not an image: ${fileId}`)
    if (Number(meta.data.size ?? 0) > MAX_SOURCE_BYTES) throw new Error(`Image too large: ${fileId}`)

    if (cached && modifiedTime && modifiedTime === cached.modifiedTime) {
      await writeFile(path.join(imageCacheDir, `${fileId}.json`), JSON.stringify({ modifiedTime }))
      return cached
    }

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    )
    const data = await sharp(Buffer.from(response.data as unknown as ArrayBuffer))
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp()
      .toBuffer()

    await mkdir(imageCacheDir, { recursive: true })
    await Promise.all([
      writeFile(path.join(imageCacheDir, `${fileId}.webp`), data),
      writeFile(path.join(imageCacheDir, `${fileId}.json`), JSON.stringify({ modifiedTime })),
    ])
    return { data: toArrayBuffer(data), modifiedTime }
  } catch (error) {
    if (cached) return cached
    throw error
  }
}, { maxEntries: 100 })

export const GET: APIRoute = async ({ params, url }) => {
  if (!params.fileId || !verifySignature('image', params.fileId, url.searchParams.get('s'))) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const image = await getImage(params.fileId)
    return new Response(image.data, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('[image] fetch failed:', error)
    return new Response('Not found', { status: 404 })
  }
}