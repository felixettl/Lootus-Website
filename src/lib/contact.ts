import { createHash } from 'node:crypto'
import nodemailer, { type Transporter } from 'nodemailer'
import { sign, verifySignature } from './signing'

export const CONTACT_TOPICS = [
  'Mithelfen bei Events',
  'Mitglied werden',
  'Booking / Kooperation',
  'Presse',
  'Sonstiges',
] as const

export const LIMITS = { name: 100, email: 200, message: 5000, minMessage: 10 }

const MIN_FILL_MS = 3_000
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000
const RATE_WINDOW_MS = 60 * 60 * 1000
const MAX_PER_CLIENT = 5
const MAX_GLOBAL = 30

export interface ContactMessage {
  name: string
  email: string
  topic: string
  message: string
}

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'rate-limited' | 'unavailable' | 'failed' }

// Signed render timestamp: lets us reject bots that submit instantly or replay ancient forms
// without cookies or server-side sessions.
export function createFormToken(now = Date.now()): string {
  return `${now}.${sign('contact', String(now))}`
}

function isFreshToken(token: string, now = Date.now()): boolean {
  const [ts, signature] = token.split('.')
  const issued = Number(ts)
  if (!Number.isFinite(issued) || !verifySignature('contact', ts, signature ?? null)) return false
  const age = now - issued
  return age >= MIN_FILL_MS && age <= MAX_FORM_AGE_MS
}

const singleLine = (value: string) => value.replace(/[\r\n\t]+/g, ' ').trim()

export function parseContactForm(form: FormData):
  | { spam: true }
  | { spam: false; message: ContactMessage | null } {
  const field = (key: string) => {
    const value = form.get(key)
    return typeof value === 'string' ? value : ''
  }

  // Honeypot: invisible to humans, bots tend to fill every field.
  if (field('website') || !isFreshToken(field('token'))) return { spam: true }

  const name = singleLine(field('name'))
  const email = singleLine(field('email'))
  const topic = field('topic')
  const message = field('message').replace(/\r\n/g, '\n').trim()

  const valid =
    name.length > 0 && name.length <= LIMITS.name &&
    email.length <= LIMITS.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    (CONTACT_TOPICS as readonly string[]).includes(topic) &&
    message.length >= LIMITS.minMessage && message.length <= LIMITS.message

  return { spam: false, message: valid ? { name, email, topic, message } : null }
}

// Only salted hashes of client addresses are kept, in memory, for at most RATE_WINDOW_MS.
const hits = new Map<string, number[]>()
let globalHits: number[] = []

function clientKey(clientAddress: string, forwardedFor: string | null): string {
  // X-Forwarded-For is only trustworthy when the request reaches us through a local reverse
  // proxy (Hetzner); the proxy appends the real address as the last entry.
  const viaLocalProxy = /^(127\.|::1$|::ffff:127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(clientAddress)
  const forwarded = viaLocalProxy ? forwardedFor?.split(',').pop()?.trim() : ''
  return createHash('sha256').update(sign('contact', forwarded || clientAddress)).digest('base64url')
}

function allowRequest(key: string, now = Date.now()): boolean {
  const cutoff = now - RATE_WINDOW_MS
  globalHits = globalHits.filter((t) => t > cutoff)
  for (const [k, times] of hits) {
    const recent = times.filter((t) => t > cutoff)
    if (recent.length) hits.set(k, recent)
    else hits.delete(k)
  }
  const mine = hits.get(key) ?? []
  if (mine.length >= MAX_PER_CLIENT || globalHits.length >= MAX_GLOBAL) return false
  hits.set(key, [...mine, now])
  globalHits.push(now)
  return true
}

let transporter: Transporter | null = null

function getTransporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  if (!user || !pass || !process.env.CONTACT_TO) return null
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.your-server.de',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    requireTLS: true,
    auth: { user, pass },
  })
  return transporter
}

export async function sendContactMessage(
  message: ContactMessage,
  client: { address: string; forwardedFor: string | null },
): Promise<ContactResult> {
  const transport = getTransporter()
  if (!transport) {
    console.error('[contact] SMTP_USER, SMTP_PASSWORD or CONTACT_TO not set')
    return { ok: false, reason: 'unavailable' }
  }
  if (!allowRequest(clientKey(client.address, client.forwardedFor))) {
    return { ok: false, reason: 'rate-limited' }
  }

  const from = process.env.CONTACT_FROM || process.env.SMTP_USER!
  try {
    await transport.sendMail({
      from: { name: 'Lootus Website', address: from },
      sender: from,
      to: process.env.CONTACT_TO,
      replyTo: { name: message.name, address: message.email },
      subject: `[Kontakt] ${message.topic} von ${message.name}`,
      text: [
        `Name: ${message.name}`,
        `E-Mail: ${message.email}`,
        `Anliegen: ${message.topic}`,
        '',
        message.message,
        '',
        '—',
        'Gesendet über das Kontaktformular auf lootuskollektiv.de.',
        'Mit „Antworten“ geht deine Antwort direkt an die absendende Person.',
      ].join('\n'),
    })
    return { ok: true }
  } catch (error) {
    console.error('[contact] sending failed:', error instanceof Error ? error.message : error)
    return { ok: false, reason: 'failed' }
  }
}
