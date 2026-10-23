#!/usr/bin/env node
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { google } from 'googleapis'
import sharp from 'sharp'

const SLIDES_FOLDER_ID = '1vRfFIFLd_ZnT6x749z8prz_Iy7Qf5LFL'
const DJS_SPREADSHEET_ID = '1i9X8W_59FBtgIkzZdVfWT2ZcPB38u_Jywa3nKq_dqfY'
const IMAGE_DIR = path.join(process.cwd(), 'public/media/drive')
const GALLERY_DIR = path.join(process.cwd(), 'public/data/galleries')

const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
const calendarId = process.env.GOOGLE_CALENDAR_ID

if (!serviceAccountKey || !calendarId) {
  console.error('GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_CALENDAR_ID must be set.')
  process.exit(1)
}

const credentials = JSON.parse(serviceAccountKey)
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
})
const drive = google.drive({ version: 'v3', auth })
const calendar = google.calendar({ version: 'v3', auth })
const sheets = google.sheets({ version: 'v4', auth })

function extractDriveFileId(url = '') {
  return url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
    ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]
    ?? ''
}

function extractDriveFolderId(url = '') {
  return url.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1] ?? ''
}

async function listFiles(query, orderBy = undefined) {
  const files = []
  let pageToken
  do {
    const response = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id)',
      orderBy,
      pageSize: 1000,
      pageToken,
    })
    files.push(...(response.data.files ?? []))
    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)
  return files.flatMap((file) => file.id ? [file.id] : [])
}

async function collectContent() {
  const subfolderIds = await listFiles(
    `'${SLIDES_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    'name',
  )
  const slideImageIds = (await Promise.all(subfolderIds.map((folderId) => listFiles(
    `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    'name',
  )))).flat()

  const sheetResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: DJS_SPREADSHEET_ID,
    range: 'A2:H',
  })
  const rows = sheetResponse.data.values ?? []
  const residentImageIds = rows.map((row) => extractDriveFileId(row[6] ?? '')).filter(Boolean)
  const galleryFolderIds = [...new Set(rows.map((row) => extractDriveFolderId(row[5] ?? '')).filter(Boolean))]

  const calendarResponse = await calendar.events.list({
    calendarId,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  })
  const eventImageIds = (calendarResponse.data.items ?? []).flatMap((event) =>
    (event.attachments ?? [])
      .filter((attachment) => attachment.mimeType?.startsWith('image/') && attachment.fileId)
      .map((attachment) => attachment.fileId),
  )

  const galleryEntries = await Promise.all(galleryFolderIds.map(async (folderId) => [
    folderId,
    await listFiles(`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`, 'name'),
  ]))
  const galleries = Object.fromEntries(galleryEntries)
  const galleryImageIds = Object.values(galleries).flat()

  return {
    galleries,
    imageIds: [...new Set([...slideImageIds, ...residentImageIds, ...eventImageIds, ...galleryImageIds])],
  }
}

async function downloadImage(fileId) {
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  )
  const image = await sharp(Buffer.from(response.data))
    .resize({ width: 1600, withoutEnlargement: true })
    .webp()
    .toBuffer()
  await writeFile(path.join(IMAGE_DIR, `${fileId}.webp`), image)
}

async function main() {
  const { galleries, imageIds } = await collectContent()

  await Promise.all([
    rm(IMAGE_DIR, { recursive: true, force: true }),
    rm(GALLERY_DIR, { recursive: true, force: true }),
  ])
  await Promise.all([
    mkdir(IMAGE_DIR, { recursive: true }),
    mkdir(GALLERY_DIR, { recursive: true }),
  ])

  for (let index = 0; index < imageIds.length; index += 4) {
    await Promise.all(imageIds.slice(index, index + 4).map(downloadImage))
  }
  await Promise.all(Object.entries(galleries).map(([folderId, ids]) =>
    writeFile(path.join(GALLERY_DIR, `${folderId}.json`), JSON.stringify(ids)),
  ))

  console.log(`Synced ${imageIds.length} images and ${Object.keys(galleries).length} galleries.`)
}

main().catch((error) => {
  console.error('[content] sync failed:', error)
  process.exit(1)
})
