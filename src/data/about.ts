import { toHTML } from '@portabletext/to-html'
import { createCache } from '../lib/cache'
import { sanity } from '../lib/sanity'

export interface AboutPage {
  title: string
  seoDescription: string
  html: string
}

export interface EventGallery {
  id: string
  name: string
  date: string
  images: string[]
}

function bodyToHtml(body: unknown[] | undefined): string {
  return toHTML((body ?? []) as any, {
    components: {
      marks: {
        link: ({ children, value }) => {
          const href = String(value?.href ?? '')
          if (!/^(https?:\/\/|mailto:)/.test(href)) return children
          const attrs = href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''
          return `<a href="${href.replace(/"/g, '&quot;')}"${attrs}>${children}</a>`
        },
      },
    },
  })
}

const fallbackAbout: AboutPage = { title: 'Über uns', seoDescription: '', html: '' }

export const fetchAbout = createCache<AboutPage>(async (previous) => {
  try {
    const row = await sanity.fetch<any | null>(`*[_type == "aboutPage"][0]{ title, seoDescription, body }`)
    if (!row) return previous ?? fallbackAbout
    return {
      title: row.title || fallbackAbout.title,
      seoDescription: row.seoDescription ?? '',
      html: bodyToHtml(row.body),
    }
  } catch (err) {
    console.error('[sanity] about fetch failed:', err)
    return previous ?? fallbackAbout
  }
})

const GALLERY_QUERY = `*[_type == "eventGallery" && count(images) > 0] | order(date desc) {
  "id": _id,
  name,
  date,
  "images": images[defined(asset)].asset._ref
}`

export const fetchGalleries = createCache<EventGallery[]>(async (previous) => {
  try {
    const rows = await sanity.fetch<any[]>(GALLERY_QUERY)
    return rows.map((r) => ({ id: r.id, name: r.name ?? '', date: r.date ?? '', images: r.images ?? [] }))
  } catch (err) {
    console.error('[sanity] galleries fetch failed:', err)
    return previous ?? []
  }
})
