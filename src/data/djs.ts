import { google } from 'googleapis'
import { createCache } from '../lib/cache'

const SPREADSHEET_ID = '1i9X8W_59FBtgIkzZdVfWT2ZcPB38u_Jywa3nKq_dqfY'

export interface DJ {
  artistName: string
  firstName: string
  lastName: string
  instaUrl: string
  soundcloudUrl: string
  photoFileId: string
  galleryFolderId: string
}

function extractDriveFileId(url: string): string {
  if (!url) return ''
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? ''
}

function extractDriveFolderId(url: string): string {
  if (!url) return ''
  const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? ''
}

// The spreadsheet's own `modifiedTime` (as a Drive file) changes whenever its content
// is edited, so we can use it to skip re-reading all rows if nothing changed.
let lastKnownModifiedTime: string | null = null

async function fetchDJsFromSheet(previous: DJ[] | undefined): Promise<DJ[]> {
  const key = import.meta.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) return []
  try {
    const credentials = JSON.parse(key)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    })

    if (previous) {
      try {
        const drive = google.drive({ version: 'v3', auth })
        const meta = await drive.files.get({ fileId: SPREADSHEET_ID, fields: 'modifiedTime' })
        const modifiedTime = meta.data.modifiedTime ?? null
        if (modifiedTime && modifiedTime === lastKnownModifiedTime) {
          return previous
        }
        lastKnownModifiedTime = modifiedTime
      } catch (err) {
        console.warn('[sheets] modifiedTime check failed, refetching anyway:', err)
      }
    }

    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A2:G',
    })
    return (res.data.values ?? [])
      .filter((row) => row[0])
      .map((row) => {
        const photoFileId = extractDriveFileId(row[6] ?? '')
        if (!photoFileId && row[6]) {
          console.warn(`[djs] kein File-ID aus URL extrahierbar: "${row[6]}"`)
        }
        return {
          artistName: row[0] ?? '',
          firstName: row[1] ?? '',
          lastName: row[2] ?? '',
          instaUrl: row[3] ?? '',
          soundcloudUrl: row[4] ?? '',
          galleryFolderId: extractDriveFolderId(row[5] ?? ''),
          photoFileId,
        }
      })
  } catch (err) {
    console.error('[sheets] DJs fetch failed:', err)
    return previous ?? []
  }
}

export const fetchDJs = createCache<DJ[]>(fetchDJsFromSheet)

