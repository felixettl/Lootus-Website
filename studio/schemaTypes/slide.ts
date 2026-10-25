import { defineField, defineType } from 'sanity'

export const slide = defineType({
  name: 'slide',
  title: 'Galerie-Bild',
  type: 'document',
  fields: [
    defineField({
      name: 'image',
      title: 'Bild',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'instagramName', title: 'Instagram-Name (Anzeige)', type: 'string' }),
    defineField({
      name: 'instagramUrl',
      title: 'Instagram-Link',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({ name: 'order', title: 'Reihenfolge', description: 'Kleinere Zahl zuerst.', type: 'number' }),
  ],
  orderings: [{ title: 'Reihenfolge', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'instagramName', media: 'image', order: 'order' },
    prepare: ({ title, media, order }) => ({ title: title || 'Ohne Instagram', subtitle: order != null ? `#${order}` : '', media }),
  },
})
