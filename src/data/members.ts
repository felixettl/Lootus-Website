import { createCache } from '../lib/cache'
import { sanity } from '../lib/sanity'

export interface Member {
  id: string
  firstName: string
  lastName: string
  role: string
  bio: string
  photo: string
  instaUrl: string
  soundcloudUrl: string
}

const QUERY = `*[_type == "member"] | order(order asc, lastName asc) {
  "id": _id,
  firstName,
  lastName,
  role,
  bio,
  "photo": photo.asset._ref,
  "instaUrl": instagramUrl,
  soundcloudUrl
}`

export const fetchMembers = createCache<Member[]>(async (previous) => {
  try {
    const rows = await sanity.fetch<any[]>(QUERY)
    return rows.map((row) => ({
      id: row.id,
      firstName: row.firstName ?? '',
      lastName: row.lastName ?? '',
      role: row.role ?? '',
      bio: row.bio ?? '',
      photo: row.photo ?? '',
      instaUrl: row.instaUrl ?? '',
      soundcloudUrl: row.soundcloudUrl ?? '',
    }))
  } catch (err) {
    console.error('[sanity] members fetch failed:', err)
    return previous ?? []
  }
})
