const API_KEY = import.meta.env.GOOGLE_API_KEY
const CALENDAR_ID = import.meta.env.GOOGLE_CALENDAR_ID
const BASE = 'https://www.googleapis.com/calendar/v3/calendars'

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
  status: 'upcoming' | 'past'
  image: string
}

function parseDescription(desc = ''): Record<string, string> {
  const meta: Record<string, string> = {}
  for (const line of desc.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)/)
    if (match) meta[match[1].toLowerCase()] = match[2].trim()
  }
  return meta
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
    status: eventDate > now ? 'upcoming' : 'past',
    image: meta.image || '',
  }
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  if (!API_KEY || !CALENDAR_ID) {
    console.warn('[calendar] GOOGLE_API_KEY or GOOGLE_CALENDAR_ID not set')
    return []
  }

  const url = `${BASE}/${encodeURIComponent(CALENDAR_ID)}/events?key=${encodeURIComponent(API_KEY)}&singleEvents=true&orderBy=startTime&maxResults=50`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error('[calendar] API error:', res.status, await res.text())
      return []
    }
    const data = await res.json()
    return (data.items || []).map(toEvent)
  } catch (err) {
    console.error('[calendar] fetch failed:', err)
    return []
  }
}
