import type { APIRoute } from 'astro'
import { fetchSiteMeta } from '../../data/site'

export const prerender = false

export const GET: APIRoute = async () => {
  try {
    const { statutesPdfUrl } = await fetchSiteMeta.refresh()
    if (!statutesPdfUrl) {
      return new Response('Die Satzung wurde noch nicht hochgeladen.', {
        status: 404,
        headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const downloadUrl = new URL(statutesPdfUrl)
    if (downloadUrl.protocol !== 'https:' || downloadUrl.hostname !== 'cdn.sanity.io') {
      return new Response('Die Satzung ist derzeit nicht verfügbar.', {
        status: 502,
        headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    downloadUrl.searchParams.set('dl', 'Satzung.pdf')
    return new Response(null, {
      status: 302,
      headers: { 'Cache-Control': 'no-store', Location: downloadUrl.toString() },
    })
  } catch (error) {
    console.error('[satzung] download redirect failed:', error)
    return new Response('Die Satzung ist derzeit nicht verfügbar.', {
      status: 502,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}