import { createCache } from '../lib/cache'
import { sanity } from '../lib/sanity'

export interface MergeColor {
  id: string
  name: string
  colorCode: string
  front: string
  back: string
}

export interface MergePiece {
  id: string
  name: string
  price?: number
  colors: MergeColor[]
}

export interface MergePageData {
  bannerTitle: string
  bannerImage: string
  pieces: MergePiece[]
  closingImage?: string
}

const fallback: MergePageData = {
  bannerTitle: 'MERCH',
  bannerImage: '',
  pieces: [],
}

const QUERY = `*[_id == "mergePage"][0]{
  bannerTitle,
  "bannerImage": bannerImage.asset._ref,
  pieces[]{
    "_key": _key,
    name,
    price,
    colors[]{
      "_key": _key,
      name,
      colorCode,
      "front": front.asset._ref,
      "back": back.asset._ref
    }
  },
  "closingImage": closingImage.asset._ref
}`

export const fetchMergePage = createCache<MergePageData>(async (previous) => {
  try {
    const row = await sanity.fetch<any | null>(QUERY)
    if (!row) return previous ?? fallback

    return {
      bannerTitle: row.bannerTitle || fallback.bannerTitle,
      bannerImage: row.bannerImage || '',
      pieces: (row.pieces ?? [])
        .filter((piece: any) => piece?._key && piece.name)
        .map((piece: any) => ({
          id: piece._key,
          name: piece.name,
          price: typeof piece.price === 'number' && Number.isFinite(piece.price) ? piece.price : undefined,
          colors: (piece.colors ?? [])
            .filter(
              (color: any) =>
                color?._key &&
                color.name &&
                /^#[0-9a-fA-F]{6}$/.test(color.colorCode ?? '') &&
                color.front &&
                color.back,
            )
            .map((color: any) => ({
              id: color._key,
              name: color.name,
              colorCode: color.colorCode,
              front: color.front,
              back: color.back,
            })),
        })),
      closingImage: row.closingImage || undefined,
    }
  } catch (err) {
    console.error('[sanity] merge page fetch failed:', err)
    return previous ?? fallback
  }
})
