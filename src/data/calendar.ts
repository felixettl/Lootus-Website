import { google } from 'googleapis'
import { parseServiceAccountKey } from '../lib/google-credentials'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
const TIME_ZONE = 'Europe/Berlin'
const MAX_EVENTS = 10

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

// Calendar-local YYYY-MM-DD for a date, independent of the server's own timezone.
function berlinDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

// RFC 3339 timestamp for 00:00 today in Berlin, e.g. 2026-10-23T00:00:00+02:00
function startOfTodayIso(now = new Date()) {
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })
    .formatToParts(now)
    .find((p) => p.type === 'timeZoneName')?.value.replace('GMT', '')
  return `${berlinDate(now)}T00:00:00${offset || '+00:00'}`
}

function formatDate(start: string) {
  // All-day events only carry a date; format it as-is instead of shifting it through UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const [y, m, d] = start.split('-')
    return `${d}.${m}.${y}`
  }
  return new Date(start).toLocaleDateString('de-DE', {
    timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatTime(startDateTime?: string, endDateTime?: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-DE', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' })
  if (!startDateTime) return ''
  return endDateTime ? `${fmt(startDateTime)} – ${fmt(endDateTime)}` : fmt(startDateTime)
}

function toEvent(item: any): CalendarEvent {
  const start: string = item.start?.dateTime || item.start?.date || ''
  const end: string = item.end?.dateTime || item.end?.date || ''
  const meta = parseDescription(item.description)
  const loc = parseLocation(item.location)
  const isAllDay = !item.start?.dateTime

  return {
    id: item.id,
    title: item.summary || '',
    date: isAllDay ? start : berlinDate(new Date(start)),
    dateLabel: formatDate(start),
    venue: loc.venue,
    place: loc.place,
    time: isAllDay ? '' : formatTime(item.start?.dateTime, item.end?.dateTime),
    price: meta.price || '',
    lineup: meta.lineup ? meta.lineup.split(',').map((s) => s.trim()) : [],
    genre: meta.genre || '',
    text: meta.text || '',
    tickets: meta.tickets ? extractUrl(meta.tickets) : '',
    driveFileId: (item.attachments || []).find((a: any) => a.mimeType?.startsWith('image/'))?.fileId || '',
    status: new Date(end || start) > new Date() ? 'upcoming' : 'past',
  }
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  if (!SERVICE_ACCOUNT_KEY || !CALENDAR_ID) {
    console.warn('[calendar] GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CALENDAR_ID not set')
    return []
  }

  try {
    const credentials = parseServiceAccountKey(SERVICE_ACCOUNT_KEY)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })
    const calendar = google.calendar({ version: 'v3', auth })
    const today = berlinDate(new Date())
    // timeMin filters by end time, so events that started before today but end today are
    // also returned; over-fetch a little and drop those to keep exactly the next MAX_EVENTS.
    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: startOfTodayIso(),
      timeZone: TIME_ZONE,
      maxResults: MAX_EVENTS + 10,
    })
    return (res.data.items || [])
      .map(toEvent)
      .filter((event) => event.date >= today)
      .slice(0, MAX_EVENTS)
  } catch (err) {
    console.error('[calendar] fetch failed:', err)
    return []
  }
}
