import type { APIRoute } from 'astro'
import { parseContactForm, sendContactMessage, type ContactResult } from '../../lib/contact'

export const prerender = false

// Browsers always send Origin on POST, so this blocks cross-site (CSRF) submissions. The Host
// header is genuine for browser requests; the site origin covers proxies that rewrite it.
function isSameOrigin(request: Request, site: URL | undefined): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    const { host } = new URL(origin)
    return host === request.headers.get('host') || host === site?.host || host === `www.${site?.host}`
  } catch {
    return false
  }
}

export const POST: APIRoute = async (context) => {
  const { request } = context
  if (!isSameOrigin(request, context.site)) {
    return new Response('Cross-site form submissions are forbidden', { status: 403 })
  }
  const wantsJson = request.headers.get('accept')?.includes('application/json') ?? false

  const respond = (result: ContactResult) => {
    const status = result.ok ? 'sent' : result.reason
    if (wantsJson) {
      const code = result.ok ? 200 : { invalid: 400, 'rate-limited': 429, unavailable: 503, failed: 502 }[result.reason]
      return Response.json({ status }, { status: code })
    }
    return context.redirect(`/kontakt?status=${status}#formular`, 303)
  }

  let form: FormData
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 64 * 1024) throw new Error('too large')
    form = await request.formData()
  } catch {
    return respond({ ok: false, reason: 'invalid' })
  }

  const parsed = parseContactForm(form)
  // Bots get the same success response so they have nothing to optimise against.
  if (parsed.spam) return respond({ ok: true })
  if (!parsed.message) return respond({ ok: false, reason: 'invalid' })

  let address = ''
  try {
    address = context.clientAddress
  } catch {}

  return respond(
    await sendContactMessage(parsed.message, {
      address,
      forwardedFor: request.headers.get('x-forwarded-for'),
    }),
  )
}
