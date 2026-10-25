import { createCache } from '../lib/cache'
import { sanity } from '../lib/sanity'

export interface DJ {
  id: string
  artistName: string
  firstName: string
  lastName: string
  instaUrl: string
  soundcloudUrl: string
  photo: string
  gallery: string[]
  genre: string
}

const QUERY = `*[_type == "dj"] | order(order asc, artistName asc) {
  "id": _id,
  artistName,
  firstName,
  lastName,
  "instaUrl": instagramUrl,
  soundcloudUrl,
  "photo": photo.asset._ref,
  "gallery": gallery[].asset._ref,
  genre
}`

export const fetchDJs = createCache<DJ[]>(async (previous) => {
  try {
    const rows = await sanity.fetch<any[]>(QUERY)
    return rows.map((row) => ({
      id: row.id,
      artistName: row.artistName ?? '',
      firstName: row.firstName ?? '',
      lastName: row.lastName ?? '',
      instaUrl: row.instaUrl ?? '',
      soundcloudUrl: row.soundcloudUrl ?? '',
      photo: row.photo ?? '',
      gallery: (row.gallery ?? []).filter(Boolean),
      genre: row.genre ?? '',
    }))
  } catch (err) {
    console.error('[sanity] DJs fetch failed:', err)
    return previous ?? []
  }
})
