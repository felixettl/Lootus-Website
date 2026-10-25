import { defineField, defineType } from 'sanity'

export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Titel', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'startsAt',
      title: 'Beginn',
      type: 'datetime',
      options: { timeStep: 15 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'endsAt',
      title: 'Ende',
      type: 'datetime',
      options: { timeStep: 15 },
      validation: (rule) =>
        rule.custom((value, { document }) => {
          const start = document?.startsAt as string | undefined
          return !value || !start || value >= start ? true : 'Ende muss nach dem Beginn liegen'
        }),
    }),
    defineField({
      name: 'allDay',
      title: 'Ganztägig (keine Uhrzeit anzeigen)',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({ name: 'venue', title: 'Location', type: 'string' }),
    defineField({ name: 'place', title: 'Ort', type: 'string' }),
    defineField({ name: 'genre', title: 'Genre', type: 'string' }),
    defineField({ name: 'price', title: 'Preis', type: 'string' }),
    defineField({ name: 'lineup', title: 'Line-up', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'text', title: 'Beschreibung', type: 'text', rows: 4 }),
    defineField({
      name: 'tickets',
      title: 'Ticket-Link',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({ name: 'image', title: 'Bild', type: 'image', options: { hotspot: true } }),
  ],
  orderings: [
    { title: 'Beginn (neueste zuerst)', name: 'startsAtDesc', by: [{ field: 'startsAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'title', date: 'startsAt', media: 'image', place: 'place' },
    prepare: ({ title, date, media, place }) => ({
      title,
      subtitle: [date ? String(date).slice(0, 10) : '', place].filter(Boolean).join(' · '),
      media,
    }),
  },
})
