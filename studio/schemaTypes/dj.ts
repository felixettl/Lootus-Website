import { defineField, defineType } from 'sanity'

export const dj = defineType({
  name: 'dj',
  title: 'Mitglied',
  type: 'document',
  fields: [
    defineField({ name: 'artistName', title: 'Künstlername', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'firstName', title: 'Vorname', type: 'string' }),
    defineField({ name: 'lastName', title: 'Nachname', type: 'string' }),
    defineField({ name: 'genre', title: 'Genre', type: 'string' }),
    defineField({ name: 'photo', title: 'Foto', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'instagramUrl',
      title: 'Instagram-Link',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'soundcloudUrl',
      title: 'SoundCloud-Link',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'gallery',
      title: 'Galerie',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      options: { layout: 'grid' },
    }),
    defineField({ name: 'order', title: 'Reihenfolge', description: 'Kleinere Zahl zuerst.', type: 'number' }),
  ],
  orderings: [{ title: 'Reihenfolge', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'artistName', subtitle: 'genre', media: 'photo' },
  },
})
