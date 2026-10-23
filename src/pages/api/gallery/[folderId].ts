import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { APIRoute } from 'astro'
import { google } from 'googleapis'
import { createKeyedCache, DEFAULT_TTL_MS } from '../../../lib/cache'
import { assertDriveId, cacheRoot } from '../../../lib/file-cache'

const galleryCacheDir = path.join(cacheRoot, 'galleries')

async function readCachedGallery(folderId: string) {
  const filePath = path.join(galleryCacheDir, `${folderId}.json`)
  try {
    const [content, info] = await Promise.all([readFile(filePath, 'utf8'), stat(filePath)])
    return { ids: JSON.parse(content) as string[], updatedAt: info.mtimeMs }
  } catch {
    return null
  }
}

const getFolderImageIds = createKeyedCache<string, string[]>(async (unsafeFolderId) => {
  const folderId = assertDriveId(unsafeFolderId)
  const cached = await readCachedGallery(folderId)
  if (cached && Date.now() - cached.updatedAt < DEFAULT_TTL_MS) return cached.ids

  try {
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set')
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(key),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id)',
      orderBy: 'name',
    })
    const ids = (response.data.files ?? []).flatMap((file) => file.id ? [file.id] : [])
    await mkdir(galleryCacheDir, { recursive: true })
    await writeFile(path.join(galleryCacheDir, `${folderId}.json`), JSON.stringify(ids))
    return ids
  } catch (error) {
    if (cached) return cached.ids
    throw error
  }
})

export const GET: APIRoute = async ({ params }) => {
  if (!params.folderId) return new Response('Not found', { status: 404 })

  try {
    const ids = await getFolderImageIds(params.folderId)
    return Response.json(ids, {
      headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=86400' },
    })
  } catch (error) {
    console.error('[gallery] folder fetch failed:', error)
    return Response.json([], { status: 500 })
  }
}