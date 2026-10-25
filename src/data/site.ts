import { toHTML } from '@portabletext/to-html'
import { createCache } from '../lib/cache'
import { sanity } from '../lib/sanity'

export interface Intro {
  hi: string
  text: string
}

export interface LegalSection {
  heading: string
  anchor: string
  html: string
}

export interface LegalPage {
  title: string
  seoTitle: string
  seoDescription: string
  sections: LegalSection[]
  credits: { text: string; instagramUrl: string; linkedinUrl: string }[]
}

const fallbackIntro: Intro = { hi: 'Hi.', text: '' }

export const fetchIntro = createCache<Intro>(async (previous) => {
  try {
    const row = await sanity.fetch<{ introHi?: string; introText?: string } | null>(
      `*[_id == "siteSettings"][0]{ introHi, introText }`,
    )
    return row ? { hi: row.introHi ?? '', text: row.introText ?? '' } : (previous ?? fallbackIntro)
  } catch (err) {
    console.error('[sanity] intro fetch failed:', err)
    return previous ?? fallbackIntro
  }
})

// Portable Text from the studio only allows plain text plus http(s)/mailto links.
function bodyToHtml(body: unknown[] | undefined): string {
  return toHTML((body ?? []) as any, {
    components: {
      marks: {
        link: ({ children, value }) => {
          const href = String(value?.href ?? '')
          if (!/^(https?:\/\/|mailto:)/.test(href)) return children
          const external = href.startsWith('http')
          const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : ''
          return `<a href="${href.replace(/"/g, '&quot;')}"${attrs}>${children}</a>`
        },
      },
    },
  })
}

const LEGAL_QUERY = `*[_type == "legalPage" && slug == $slug][0]{
  title, seoTitle, seoDescription,
  sections[]{ heading, anchor, body },
  credits[]{ text, instagramUrl, linkedinUrl }
}`

export async function fetchLegalPage(slug: 'impressum' | 'datenschutz'): Promise<LegalPage | null> {
  try {
    const row = await sanity.fetch<any | null>(LEGAL_QUERY, { slug })
    if (!row) return null
    return {
      title: row.title ?? '',
      seoTitle: row.seoTitle ?? row.title ?? '',
      seoDescription: row.seoDescription ?? '',
      sections: (row.sections ?? []).map((s: any) => ({
        heading: s.heading ?? '',
        anchor: s.anchor ?? '',
        html: bodyToHtml(s.body),
      })),
      credits: (row.credits ?? []).map((c: any) => ({
        text: c.text ?? '',
        instagramUrl: c.instagramUrl ?? '',
        linkedinUrl: c.linkedinUrl ?? '',
      })),
    }
  } catch (err) {
    console.error(`[sanity] ${slug} fetch failed:`, err)
    return null
  }
}
