import { google } from 'googleapis'

const FOLDER_ID = '1vRfFIFLd_ZnT6x749z8prz_Iy7Qf5LFL'

export async function fetchSlides(): Promise<string[]> {
  const key = import.meta.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) return []
  try {
    const credentials = JSON.parse(key)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })
    const res = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    })
    return (res.data.files ?? []).map(f => f.id!).filter(Boolean)
  } catch (err) {
    console.error('[drive] slides fetch failed:', err)
    return []
  }
}
