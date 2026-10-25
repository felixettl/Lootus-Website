import { defineField, defineType } from 'sanity'

export const member = defineType({
  name: 'member',
  title: 'Mitglied',
  type: 'document',
  fields: [
    defineField({
      name: 'photo',
      title: 'Bild',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'firstName', title: 'Vorname', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'lastName', title: 'Nachname', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'role',
      title: 'Aufgabe / Rolle',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'bio', title: 'Text', type: 'text', rows: 5, validation: (rule) => rule.required() }),
    defineField({
      name: 'instagramUrl',
      title: 'Instagram-Link (optional)',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'soundcloudUrl',
      title: 'SoundCloud-Link (optional)',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({ name: 'order', title: 'Reihenfolge', description: 'Kleinere Zahl zuerst.', type: 'number' }),
  ],
  orderings: [{ title: 'Reihenfolge', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { first: 'firstName', last: 'lastName', role: 'role', media: 'photo' },
    prepare: ({ first, last, role, media }) => ({
      title: [first, last].filter(Boolean).join(' '),
      subtitle: role,
      media,
    }),
  },
})
