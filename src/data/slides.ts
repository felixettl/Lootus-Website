import { google } from 'googleapis'
import { createCache } from '../lib/cache'

const FOLDER_ID = '1vRfFIFLd_ZnT6x749z8prz_Iy7Qf5LFL'

export interface Slide {
  id: string
  instagram?: { displayName: string; url: string }
}

// Tracks the Drive "changes" page token so we can cheaply ask "did anything change
// since last time?" instead of always re-crawling folders/files.
let changesPageToken: string | null = null

async function driveChangedSinceLastCheck(drive: ReturnType<typeof google.drive>): Promise<boolean> {
  try {
    if (!changesPageToken) {
      const start = await drive.changes.getStartPageToken({})
      changesPageToken = start.data.startPageToken ?? null
      return true // no baseline yet, must do a full fetch
    }
    const res = await drive.changes.list({
      pageToken: changesPageToken,
      pageSize: 1000,
      fields: 'nextPageToken, newStartPageToken, changes(fileId)',
    })
    changesPageToken = res.data.newStartPageToken ?? res.data.nextPageToken ?? changesPageToken
    return (res.data.changes?.length ?? 0) > 0
  } catch (err) {
    console.warn('[drive] change check failed, refetching slides anyway:', err)
    return true
  }
}

async function fetchSlidesFromDrive(previous: Slide[] | undefined): Promise<Slide[]> {
  const key = import.meta.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) return []
  try {
    const credentials = JSON.parse(key)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })

    if (previous && !(await driveChangedSinceLastCheck(drive))) {
      return previous
    }

    const foldersRes = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    })
    const subfolders = foldersRes.data.files ?? []

    const slides: Slide[] = []

    for (const folder of subfolders) {
      if (!folder.id) continue

      let instagram: Slide['instagram']
      const jsonRes = await drive.files.list({
        q: `'${folder.id}' in parents and name = 'instagram.json' and trashed = false`,
        fields: 'files(id)',
      })
      const jsonFile = jsonRes.data.files?.[0]
      if (jsonFile?.id) {
        try {
          const content = (await drive.files.get(
            { fileId: jsonFile.id, alt: 'media' },
            { responseType: 'text' },
          )) as any
          const parsed = JSON.parse(content.data)
          if (parsed.displayName && parsed.instagram) {
            instagram = { displayName: parsed.displayName, url: parsed.instagram }
          }
        } catch {}
      }

      const imagesRes = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'files(id, name)',
        orderBy: 'name',
      })
      for (const img of imagesRes.data.files ?? []) {
        if (img.id) slides.push({ id: img.id, instagram })
      }
    }

    return slides
  } catch (err) {
    console.error('[drive] slides fetch failed:', err)
    return previous ?? []
  }
}

export const fetchSlides = createCache<Slide[]>(fetchSlidesFromDrive)

