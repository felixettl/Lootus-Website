import type { APIRoute } from 'astro'
import { google } from 'googleapis'
import { createKeyedCache } from '../../../lib/cache'

const getFolderImageIds = createKeyedCache<string, string[]>(async (folderId) => {
  const key = import.meta.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) return []

  const credentials = JSON.parse(key)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  const drive = google.drive({ version: 'v3', auth })
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: 'files(id)',
    orderBy: 'name',
  })
  return (res.data.files ?? []).map((f) => f.id).filter((id): id is string => Boolean(id))
})

export const GET: APIRoute = async ({ params }) => {
  const { folderId } = params
  if (!folderId) return new Response('Not found', { status: 404 })

  try {
    const ids = await getFolderImageIds(folderId)
    return new Response(JSON.stringify(ids), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900',
      },
    })
  } catch (err) {
    console.error('[gallery] folder fetch failed:', err)
    return new Response('[]', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

