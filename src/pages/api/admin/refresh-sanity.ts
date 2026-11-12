import { timingSafeEqual } from 'node:crypto'
import type { APIRoute } from 'astro'
import { fetchAbout, fetchGalleries } from '../../../data/about'
import { fetchEvents } from '../../../data/calendar'
import { fetchMembers } from '../../../data/members'
import { fetchIntro, fetchSiteMeta } from '../../../data/site'
import { fetchSlides } from '../../../data/slides'

export const prerender = false

const responseHeaders = { 'Cache-Control': 'no-store' }

function hasValidToken(request: Request, expectedToken: string): boolean {
  const authorization = request.headers.get('authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) return false

  const supplied = Buffer.from(authorization.slice(7))
  const expected = Buffer.from(expectedToken)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export const POST: APIRoute = async ({ request }) => {
  const expectedToken = process.env.ADMIN_REFRESH_TOKEN
  if (!expectedToken) {
    return Response.json({ error: 'Refresh endpoint is not configured' }, { status: 503, headers: responseHeaders })
  }
  if (!hasValidToken(request, expectedToken)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: responseHeaders })
  }

  try {
    await Promise.all([
      fetchAbout.refresh(),
      fetchGalleries.refresh(),
      fetchEvents.refresh(),
      fetchMembers.refresh(),
      fetchIntro.refresh(),
      fetchSiteMeta.refresh(),
      fetchSlides.refresh(),
    ])
    return Response.json({ ok: true, message: 'Sanity-Daten geprüft' }, { headers: responseHeaders })
  } catch (error) {
    console.error('[admin] Sanity refresh failed:', error)
    return Response.json({ error: 'Sanity refresh failed' }, { status: 502, headers: responseHeaders })
  }
}