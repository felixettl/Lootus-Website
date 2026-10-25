import { createClient } from '@sanity/client'

export const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || 'zgboj0ia'
export const SANITY_DATASET = process.env.SANITY_DATASET || 'production'

// Public, read-only dataset: no token needed.
export const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: '2025-01-01',
  useCdn: true,
  perspective: 'published',
})

// Images are proxied through /api/image so visitors never talk to Sanity's CDN directly.
export function imageUrl(assetRef: string, width = 1600): string {
  return `/api/image/${assetRef}?w=${width}`
}
