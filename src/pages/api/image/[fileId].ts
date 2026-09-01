import type { APIRoute } from 'astro'
import { google } from 'googleapis'

export const GET: APIRoute = async ({ params }) => {
  const { fileId } = params
  if (!fileId) return new Response('Not found', { status: 404 })

  const key = import.meta.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) return new Response('Not configured', { status: 500 })

  try {
    const credentials = JSON.parse(key)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })

    const meta = await drive.files.get({ fileId, fields: 'mimeType' })
    const mimeType = meta.data.mimeType || 'image/jpeg'

    const response = (await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    )) as any

    return new Response(response.data as ArrayBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('[drive] image fetch failed:', err)
    return new Response('Not found', { status: 404 })
  }
}
