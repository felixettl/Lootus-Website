import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { APIRoute } from 'astro'
import { createKeyedCache } from '../../../lib/cache'
import { imageCacheDir, scheduleCachePrune } from '../../../lib/file-cache'
import { SANITY_DATASET, SANITY_PROJECT_ID } from '../../../lib/sanity'

const ASSET_REF = /^image-([a-f0-9]{40})-(\d+x\d+)-([a-z]+)$/
const WIDTHS = [400, 800, 1600]
const MAX_WIDTH = 1600

// Sanity assets are content-addressed and never change, so cached copies never go stale.
const getImage = createKeyedCache<string, ArrayBuffer>(async (key) => {
  const cachePath = path.join(imageCacheDir, `${key}.webp`)
  try {
    const data = await readFile(cachePath)
    return Uint8Array.from(data).buffer
  } catch {}

  const [assetRef, width] = key.split('@')
  const [, hash, size, ext] = assetRef.match(ASSET_REF)!
  const cdnUrl =
    `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${hash}-${size}.${ext}` +
    `?w=${width}&fm=webp&q=80&fit=max`
  const response = await fetch(cdnUrl)
  if (!response.ok) throw new Error(`Sanity CDN responded ${response.status} for ${assetRef}`)
  const data = new Uint8Array(await response.arrayBuffer())

  await mkdir(imageCacheDir, { recursive: true })
  await writeFile(cachePath, data)
  return data.buffer as ArrayBuffer
}, { ttlMs: Infinity, maxEntries: 100 })

export const GET: APIRoute = async ({ params, url }) => {
  const assetRef = params.assetId ?? ''
  if (!ASSET_REF.test(assetRef)) return new Response('Not found', { status: 404 })

  const requested = Number(url.searchParams.get('w'))
  const width = WIDTHS.includes(requested) ? requested : MAX_WIDTH

  scheduleCachePrune()
  try {
    const data = await getImage(`${assetRef}@${width}`)
    return new Response(data, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[image] fetch failed:', error)
    return new Response('Not found', { status: 404 })
  }
}
