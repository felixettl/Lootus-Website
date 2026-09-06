import type { APIRoute } from 'astro'
import { google } from 'googleapis'
import { head, put } from '@vercel/blob'
import { createKeyedCache, DEFAULT_TTL_MS } from '../../../lib/cache'
import { blobToken } from '../../../lib/blob'

const listPath = (folderId: string) => `gallery/${folderId}.json`

// Persisted in Vercel Blob so sporadic traffic doesn't keep hitting Drive on every cold start.
const getFolderImageIds = createKeyedCache<string, string[]>(async (folderId) => {
  const info = await head(listPath(folderId), { token: blobToken }).catch(() => null)
  if (info && Date.now() - info.uploadedAt.getTime() < DEFAULT_TTL_MS) {
    return (await fetch(info.url).then((r) => r.json())) as string[]
  }

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
  const ids = (res.data.files ?? []).map((f) => f.id).filter((id): id is string => Boolean(id))

  await put(listPath(folderId), JSON.stringify(ids), {
    access: 'public', contentType: 'application/json', allowOverwrite: true, cacheControlMaxAge: DEFAULT_TTL_MS / 1000, token: blobToken,
  })
  return ids
})

export const GET: APIRoute = async ({ params }) => {
  const { folderId } = params
  if (!folderId) return new Response('Not found', { status: 404 })

  try {
    const ids = await getFolderImageIds(folderId)
    return new Response(JSON.stringify(ids), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=86400',
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

