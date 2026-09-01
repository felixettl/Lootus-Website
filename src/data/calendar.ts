import { google } from 'googleapis'

const CALENDAR_ID = import.meta.env.GOOGLE_CALENDAR_ID
const SERVICE_ACCOUNT_KEY = import.meta.env.GOOGLE_SERVICE_ACCOUNT_KEY

export interface CalendarEvent {
  id: string
  title: string
  date: string
  dateLabel: string
  venue: string
  place: string
  time: string
  price: string
  lineup: string[]
  genre: string
  text: string
  tickets: string
  driveFileId: string
  status: 'upcoming' | 'past'
}

function parseDescription(desc = ''): Record<string, string> {
  const meta: Record<string, string> = {}
  let currentKey: string | null = null
  for (const line of desc.split('\n')) {
    const match = line.match(/^([A-Za-z]\w*):\s*(.*)/)
    if (match) {
      currentKey = match[1].toLowerCase()
      meta[currentKey] = match[2].trim()
    } else if (currentKey && line.trim()) {
      meta[currentKey] += '\n' + line.trim()
    }
  }
  return meta
}

// Extracts URL from plain text or markdown link: [label](url)
function extractUrl(value: string): string {
  const m = value.match(/\(([^)]+)\)/)
  const url = m ? m[1] : value.trim()
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function parseLocation(location = '') {
  const parts = location.split(',').map((s) => s.trim())
  return { venue: parts[0] || '', place: parts[1] || '' }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(startIso: string, endIso?: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  if (!startIso) return ''
  return endIso ? `${fmt(startIso)} – ${fmt(endIso)}` : fmt(startIso)
}

function toEvent(item: any): CalendarEvent {
  const start: string = item.start?.dateTime || item.start?.date || ''
  const end: string = item.end?.dateTime || item.end?.date || ''
  const meta = parseDescription(item.description)
  const loc = parseLocation(item.location)
  const now = new Date()
  const eventDate = new Date(start)

  return {
    id: item.id,
    title: item.summary || '',
    date: start.slice(0, 10),
    dateLabel: formatDate(start),
    venue: loc.venue,
    place: loc.place,
    time: formatTime(start, end),
    price: meta.price || '',
    lineup: meta.lineup ? meta.lineup.split(',').map((s) => s.trim()) : [],
    genre: meta.genre || '',
    text: meta.text || '',
    tickets: meta.tickets ? extractUrl(meta.tickets) : '',
    driveFileId: (item.attachments || []).find((a: any) => a.mimeType?.startsWith('image/'))?.fileId || '',
    status: eventDate > now ? 'upcoming' : 'past',
  }
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  if (!SERVICE_ACCOUNT_KEY || !CALENDAR_ID) {
    console.warn('[calendar] GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CALENDAR_ID not set')
    return []
  }

  try {
    const credentials = JSON.parse(SERVICE_ACCOUNT_KEY)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })
    const calendar = google.calendar({ version: 'v3', auth })
    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    })
    return (res.data.items || []).map(toEvent)
  } catch (err) {
    console.error('[calendar] fetch failed:', err)
    return []
  }
}
