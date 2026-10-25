import { createCache } from '../lib/cache'
import { sanity } from '../lib/sanity'

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
  image: string
  status: 'upcoming' | 'past'
}

// Calendar-local YYYY-MM-DD for a date, independent of the server's own timezone.
function berlinDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

function formatTime(startsAt: string, endsAt?: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-DE', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' })
  return endsAt ? `${fmt(startsAt)} – ${fmt(endsAt)}` : fmt(startsAt)
}

const QUERY = `*[_type == "event" && dateTime(coalesce(endsAt, startsAt)) >= dateTime($from)]
  | order(startsAt asc)[0...$limit] {
  "id": _id,
  title,
  startsAt,
  endsAt,
  allDay,
  venue,
  place,
  genre,
  price,
  lineup,
  text,
  tickets,
  "image": image.asset._ref
}`

function toEvent(row: any): CalendarEvent {
  const date = berlinDate(new Date(row.startsAt))
  const [y, m, d] = date.split('-')
  return {
    id: row.id,
    title: row.title ?? '',
    date,
    dateLabel: `${d}.${m}.${y}`,
    venue: row.venue ?? '',
    place: row.place ?? '',
    time: row.allDay ? '' : formatTime(row.startsAt, row.endsAt),
    price: row.price ?? '',
    lineup: row.lineup ?? [],
    genre: row.genre ?? '',
    text: row.text ?? '',
    tickets: row.tickets ?? '',
    image: row.image ?? '',
    status: new Date(row.endsAt || row.startsAt) > new Date() ? 'upcoming' : 'past',
  }
}

export const fetchEvents = createCache<CalendarEvent[]>(async (previous) => {
  try {
    // Over-fetch from 36h ago so events running into today are included, then trim by Berlin date.
    const rows = await sanity.fetch<any[]>(QUERY, {
      from: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      limit: MAX_EVENTS + 10,
    })
    const today = berlinDate(new Date())
    return rows.map(toEvent).filter((event) => event.date >= today).slice(0, MAX_EVENTS)
  } catch (err) {
    console.error('[sanity] events fetch failed:', err)
    return previous ?? []
  }
})
