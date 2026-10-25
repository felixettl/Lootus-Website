import { createCache } from '../lib/cache'
import { sanity } from '../lib/sanity'

export interface Slide {
  id: string
  image: string
  instagram?: { displayName: string; url: string }
}

const QUERY = `*[_type == "slide" && defined(image.asset)] | order(order asc, _createdAt asc) {
  "id": _id,
  "image": image.asset._ref,
  instagramName,
  instagramUrl
}`

export const fetchSlides = createCache<Slide[]>(async (previous) => {
  try {
    const rows = await sanity.fetch<any[]>(QUERY)
    return rows.map((row) => ({
      id: row.id,
      image: row.image,
      instagram:
        row.instagramName && row.instagramUrl
          ? { displayName: row.instagramName, url: row.instagramUrl }
          : undefined,
    }))
  } catch (err) {
    console.error('[sanity] slides fetch failed:', err)
    return previous ?? []
  }
})
