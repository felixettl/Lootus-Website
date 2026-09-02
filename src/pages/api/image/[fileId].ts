import type { APIRoute } from 'astro'
import { google } from 'googleapis'
import { createKeyedCache } from '../../../lib/cache'

interface CachedImage {
  mimeType: string
  modifiedTime: string | null
  data: ArrayBuffer
}

const getImage = createKeyedCache<string, CachedImage>(async (fileId, previous) => {
  const key = import.meta.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set')

  const credentials = JSON.parse(key)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  const drive = google.drive({ version: 'v3', auth })

  const meta = await drive.files.get({ fileId, fields: 'mimeType, modifiedTime' })
  const mimeType = meta.data.mimeType || 'image/jpeg'
  const modifiedTime = meta.data.modifiedTime ?? null

  // skip re-downloading the file bytes if the Drive file hasn't changed
  if (previous && modifiedTime && modifiedTime === previous.modifiedTime) {
    return previous
  }

  const response = (await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  )) as any

  return { mimeType, modifiedTime, data: response.data as ArrayBuffer }
})

export const GET: APIRoute = async ({ params }) => {
  const { fileId } = params
  if (!fileId) return new Response('Not found', { status: 404 })

  try {
    const image = await getImage(fileId)
    return new Response(image.data, {
      headers: {
        'Content-Type': image.mimeType,
        'Cache-Control': 'public, max-age=900',
      },
    })
  } catch (err) {
    console.error('[drive] image fetch failed:', err)
    return new Response('Not found', { status: 404 })
  }
}

