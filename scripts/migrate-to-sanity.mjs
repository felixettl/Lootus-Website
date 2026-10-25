// One-off migration: copies events, slides, members, intro text and legal pages into Sanity.
// Usage: node scripts/migrate-to-sanity.mjs [events|slides|djs|content|all]
// Needs SANITY_WRITE_TOKEN (Editor) plus the old GOOGLE_* variables in .env. Safe to re-run:
// documents use fixed ids and assets are de-duplicated by Sanity.
import { randomUUID } from 'node:crypto'
import { createClient } from '@sanity/client'
import { google } from 'googleapis'

process.loadEnvFile('.env')

const SPREADSHEET_ID = '1i9X8W_59FBtgIkzZdVfWT2ZcPB38u_Jywa3nKq_dqfY'
const SLIDES_FOLDER_ID = '1vRfFIFLd_ZnT6x749z8prz_Iy7Qf5LFL'

const { SANITY_WRITE_TOKEN, GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_CALENDAR_ID } = process.env
if (!SANITY_WRITE_TOKEN) throw new Error('SANITY_WRITE_TOKEN fehlt in .env')

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'zgboj0ia',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2025-01-01',
  token: SANITY_WRITE_TOKEN,
  useCdn: false,
})

const only = process.argv[2] ?? 'all'
const wants = (name) => only === 'all' || only === name

function parseServiceAccountKey(value) {
  const raw = value.trim()
  return JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'))
}

function googleAuth() {
  if (!GOOGLE_SERVICE_ACCOUNT_KEY) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY fehlt in .env')
  return new google.auth.GoogleAuth({
    credentials: parseServiceAccountKey(GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  })
}

const auth = only === 'content' ? null : googleAuth()
const drive = auth && google.drive({ version: 'v3', auth })

const assetCache = new Map()

async function uploadDriveImage(fileId) {
  if (!fileId) return undefined
  if (!assetCache.has(fileId)) {
    const meta = await drive.files.get({ fileId, fields: 'name' })
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' })
    const asset = await sanity.assets.upload('image', Buffer.from(res.data), {
      filename: meta.data.name ?? `${fileId}.jpg`,
    })
    assetCache.set(fileId, asset._id)
  }
  return { _type: 'image', asset: { _type: 'reference', _ref: assetCache.get(fileId) } }
}

async function listImages(folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: 'files(id)',
    orderBy: 'name',
    pageSize: 1000,
  })
  return (res.data.files ?? []).map((f) => f.id)
}

const driveFileId = (url = '') =>
  (url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/))?.[1] ?? ''
const driveFolderId = (url = '') => url.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1] ?? ''

// ---------- Events ----------

function parseDescription(desc = '') {
  const meta = {}
  let key = null
  for (const line of desc.split('\n')) {
    const match = line.match(/^([A-Za-z]\w*):\s*(.*)/)
    if (match) {
      key = match[1].toLowerCase()
      meta[key] = match[2].trim()
    } else if (key && line.trim()) {
      meta[key] += '\n' + line.trim()
    }
  }
  return meta
}

function extractUrl(value) {
  const m = value.match(/\(([^)]+)\)/)
  const url = m ? m[1] : value.trim()
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

async function migrateEvents() {
  const calendar = google.calendar({ version: 'v3', auth })
  const timeMin = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()
  const res = await calendar.events.list({
    calendarId: GOOGLE_CALENDAR_ID,
    singleEvents: true,
    orderBy: 'startTime',
    timeMin,
    maxResults: 250,
  })
  for (const item of res.data.items ?? []) {
    const meta = parseDescription(item.description)
    const [venue = '', place = ''] = (item.location ?? '').split(',').map((s) => s.trim())
    const allDay = !item.start?.dateTime
    const startsAt = item.start?.dateTime ?? `${item.start?.date}T00:00:00+02:00`
    const endsAt = item.end?.dateTime
    const fileId = (item.attachments ?? []).find((a) => a.mimeType?.startsWith('image/'))?.fileId
    await sanity.createOrReplace({
      _id: `event-${item.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
      _type: 'event',
      title: item.summary ?? '',
      startsAt: new Date(startsAt).toISOString(),
      ...(endsAt && { endsAt: new Date(endsAt).toISOString() }),
      allDay,
      venue,
      place,
      genre: meta.genre ?? '',
      price: meta.price ?? '',
      lineup: meta.lineup ? meta.lineup.split(',').map((s) => s.trim()).filter(Boolean) : [],
      text: meta.text ?? '',
      ...(meta.tickets && { tickets: extractUrl(meta.tickets) }),
      ...(fileId && { image: await uploadDriveImage(fileId) }),
    })
    console.log('event:', item.summary)
  }
}

// ---------- Slides ----------

async function migrateSlides() {
  const folders = await drive.files.list({
    q: `'${SLIDES_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    orderBy: 'name',
  })
  let order = 0
  for (const folder of folders.data.files ?? []) {
    let instagram
    const json = await drive.files.list({
      q: `'${folder.id}' in parents and name = 'instagram.json' and trashed = false`,
      fields: 'files(id)',
    })
    if (json.data.files?.[0]?.id) {
      try {
        const content = await drive.files.get({ fileId: json.data.files[0].id, alt: 'media' }, { responseType: 'text' })
        const parsed = JSON.parse(content.data)
        if (parsed.displayName && parsed.instagram) instagram = parsed
      } catch {}
    }
    for (const fileId of await listImages(folder.id)) {
      await sanity.createOrReplace({
        _id: `slide-${fileId}`,
        _type: 'slide',
        image: await uploadDriveImage(fileId),
        ...(instagram && { instagramName: instagram.displayName, instagramUrl: instagram.instagram }),
        order: order++,
      })
      console.log('slide:', folder.name, fileId)
    }
  }
}

// ---------- Members ----------

async function migrateDJs() {
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'A2:H' })
  let order = 0
  for (const row of (res.data.values ?? []).filter((r) => r[0])) {
    const folderId = driveFolderId(row[5])
    const gallery = []
    if (folderId) {
      for (const fileId of await listImages(folderId)) {
        gallery.push({ _key: randomUUID().slice(0, 12), ...(await uploadDriveImage(fileId)) })
      }
    }
    const photoId = driveFileId(row[6])
    await sanity.createOrReplace({
      _id: `dj-${row[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      _type: 'dj',
      artistName: row[0],
      firstName: row[1] ?? '',
      lastName: row[2] ?? '',
      ...(row[3] && { instagramUrl: row[3] }),
      ...(row[4] && { soundcloudUrl: row[4] }),
      genre: row[7] ?? '',
      ...(photoId && { photo: await uploadDriveImage(photoId) }),
      gallery,
      order: order++,
    })
    console.log('dj:', row[0])
  }
}

// ---------- Intro + legal pages ----------

// `[label](url)` becomes a link; "\n" stays inside the block and renders as a line break.
function block(text) {
  const markDefs = []
  const children = []
  let last = 0
  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    if (m.index > last) children.push({ _type: 'span', _key: randomUUID().slice(0, 12), text: text.slice(last, m.index), marks: [] })
    const key = randomUUID().slice(0, 12)
    markDefs.push({ _type: 'link', _key: key, href: m[2] })
    children.push({ _type: 'span', _key: randomUUID().slice(0, 12), text: m[1], marks: [key] })
    last = m.index + m[0].length
  }
  if (last < text.length) children.push({ _type: 'span', _key: randomUUID().slice(0, 12), text: text.slice(last), marks: [] })
  return { _type: 'block', _key: randomUUID().slice(0, 12), style: 'normal', markDefs, children }
}

const section = (heading, paragraphs, anchor) => ({
  _type: 'section',
  _key: randomUUID().slice(0, 12),
  heading,
  ...(anchor && { anchor }),
  body: paragraphs.map(block),
})

const credit = (text, instagramUrl, linkedinUrl) => ({
  _type: 'credit',
  _key: randomUUID().slice(0, 12),
  text,
  ...(instagramUrl && { instagramUrl }),
  ...(linkedinUrl && { linkedinUrl }),
})

const MAIL = '[lootuskollektiv@gmail.com](mailto:lootuskollektiv@gmail.com)'

const impressum = {
  _id: 'legal-impressum',
  _type: 'legalPage',
  slug: 'impressum',
  title: 'Impressum',
  seoTitle: 'Impressum — Lootus Kollektiv',
  seoDescription: 'Impressum von Lootus Kollektiv.',
  sections: [
    section('Angaben gemäß § 5 DDG', ['Lootus Kollektiv e.V.\nJungerhalde 44\n78464 Konstanz\nDeutschland']),
    section('Vertreten durch', ['Sven Schimmelpfennig, 1. Vorsitzender\nAmy Lee Neher, 2. Vorsitzende']),
    section('Kontakt', ['E-Mail: lootuskollektiv@gmail.com']),
    section('Vereinsregister', [
      'Eingetragen im Vereinsregister.\nRegistergericht: Amtsgericht Freiburg im Breisgau\nRegisternummer: VR 705010',
    ]),
    section('Redaktionell verantwortlich', ['Amy Lee Neher\nSven Schimmelpfennig\nJungerhalde 44\n78464 Konstanz']),
  ],
  credits: [
    credit('Webdesign & Gestaltung: Felix Ettl', 'https://www.instagram.com/_felix.ettl/', 'https://www.linkedin.com/in/felix-ettl-366697293/'),
    credit('Founder & Designer: Anton Maier', 'https://www.instagram.com/antonmaier_/'),
    credit('Fotos: Amy Lee Neher', 'https://www.instagram.com/amezzlee/'),
  ],
}

const datenschutz = {
  _id: 'legal-datenschutz',
  _type: 'legalPage',
  slug: 'datenschutz',
  title: 'Datenschutzerklärung',
  seoTitle: 'Datenschutz — Lootus Kollektiv',
  seoDescription: 'Datenschutzerklärung von Lootus Kollektiv.',
  sections: [
    section('1. Verantwortlicher', [`Lootus Kollektiv e.V.\nJungerhalde 44\n78464 Konstanz\nE-Mail: ${MAIL}`]),
    section('2. Allgemeines', [
      'Diese Website setzt keine Cookies, nutzt keine Analyse-, Tracking- oder Werbedienste und speichert keine Daten im Browser. Alle Inhalte, Bilder und Schriftarten werden von unserem eigenen Server ausgeliefert. Beim Besuch der Seite wird keine Verbindung zu Servern von Drittanbietern (z. B. Sanity, Instagram) aufgebaut.',
    ]),
    section('3. Hosting und Server-Logfiles', [
      'Diese Website wird bei der Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Deutschland, gehostet. Mit Hetzner besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. Beim Aufruf der Seite verarbeitet der Server automatisch technische Zugriffsdaten (IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, übertragene Datenmenge, Browsertyp und Betriebssystem) in Server-Logfiles. Dies ist technisch notwendig, um die Website auszuliefern und sicher zu betreiben (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse). Die Logfiles werden nur kurzzeitig gespeichert und anschließend automatisch gelöscht.',
    ]),
    section('4. Inhalte der Website (Programm, DJs, Fotos)', [
      'Programm, DJ-Profile und Fotos pflegen wir im Content-Management-System Sanity. Unser Webserver ruft diese Inhalte serverseitig ab und speichert sie zwischen. Dein Browser kommuniziert dabei ausschließlich mit unserem Server, nicht mit Sanity; deine IP-Adresse oder andere Besucherdaten werden nicht an Sanity übertragen.',
      'Auf der Website nennen wir DJs mit Künstlername und teilweise Vor- und Nachname und zeigen Fotos von Personen. Die Veröffentlichung erfolgt mit Einwilligung der genannten bzw. abgebildeten Personen (Art. 6 Abs. 1 lit. a DSGVO). Die Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen werden; wende dich dazu an die oben genannte E-Mail-Adresse, wir entfernen die Inhalte dann umgehend.',
    ]),
    section('5. Kontakt per E-Mail', [
      'Wenn du uns per E-Mail schreibst, verarbeiten wir deine Adresse und den Inhalt deiner Nachricht, um deine Anfrage zu beantworten (Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO). Unser E-Mail-Postfach wird bei Google (Gmail) geführt. Wir löschen Anfragen, sobald sie erledigt sind und keine gesetzlichen Aufbewahrungspflichten bestehen.',
    ]),
    section('6. Kontaktformular', [
      'Wenn du uns über das Kontaktformular schreibst, verarbeiten wir deinen Namen, deine E-Mail-Adresse, das gewählte Anliegen und deine Nachricht, um deine Anfrage zu beantworten (Art. 6 Abs. 1 lit. b DSGVO bei Anfragen zu Mitgliedschaft, Mithilfe oder Booking, sonst Art. 6 Abs. 1 lit. f DSGVO). Die Angaben werden nicht auf dem Webserver gespeichert, sondern direkt als E-Mail über den Mailserver unseres Hosters Hetzner an unser Postfach geschickt. Dort löschen wir sie, sobald deine Anfrage erledigt ist und keine gesetzlichen Aufbewahrungspflichten bestehen.',
      'Zum Schutz vor Spam setzen wir keine Cookies und keine Dienste von Drittanbietern ein. Wir prüfen nur, wie schnell das Formular ausgefüllt wurde, und begrenzen die Anzahl der Nachrichten pro Absender. Dafür halten wir einen pseudonymisierten Hashwert deiner IP-Adresse höchstens eine Stunde lang im Arbeitsspeicher des Servers und verwerfen ihn danach (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse am Schutz vor Missbrauch).',
    ], 'kontaktformular'),
    section('7. Externe Links', [
      'Die Website enthält Links zu Instagram, SoundCloud, LinkedIn und zu Ticketanbietern. Es findet keine automatische Einbindung statt (kein Embed, kein Social Plugin). Erst wenn du einen Link anklickst, verlässt du unsere Seite, und es gelten die Datenschutzbestimmungen des jeweiligen Anbieters.',
    ]),
    section('8. Deine Rechte', [
      'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen die Verarbeitung deiner personenbezogenen Daten (Art. 15–21 DSGVO). Erteilte Einwilligungen kannst du jederzeit widerrufen. Wende dich dazu an die oben genannte Kontaktadresse. Zudem besteht ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde, z. B. beim Landesbeauftragten für den Datenschutz und die Informationsfreiheit Baden-Württemberg.',
    ]),
  ],
}

async function migrateContent() {
  await sanity.createOrReplace({
    _id: 'siteSettings',
    _type: 'siteSettings',
    introHi: 'Hi.',
    introText:
      'Schön, dass du da bist. Wir sind Lootus aus Konstanz und haben Lust, mit dir zusammen zu elektronischer Musik zu feiern: in einer Runde, in der du dich wohlfühlen kannst, auch wenn du noch niemanden kennst. Dafür stecken wir gemeinsam Zeit, Ideen und viel Herz in unsere Abende. Ob du einfach tanzen möchtest oder selbst eine Idee mitbringst: Wir freuen uns auf dich.',
  })
  await sanity.createOrReplace(impressum)
  await sanity.createOrReplace(datenschutz)
  console.log('intro + legal pages')
}

if (wants('content')) await migrateContent()
if (wants('events')) await migrateEvents()
if (wants('slides')) await migrateSlides()
if (wants('djs')) await migrateDJs()
console.log('fertig')
