import { defineArrayMember, defineField, defineType } from 'sanity'

export const eventGallery = defineType({
  name: 'eventGallery',
  title: 'Event-Fotogalerie',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Eventname', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'date', title: 'Datum', type: 'date', validation: (rule) => rule.required() }),
    defineField({
      name: 'images',
      title: 'Fotos',
      type: 'array',
      of: [defineArrayMember({ type: 'image', options: { hotspot: true } })],
      options: { layout: 'grid' },
      validation: (rule) => rule.required().min(1),
    }),
  ],
  orderings: [{ title: 'Datum (neueste zuerst)', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] }],
  preview: {
    select: { title: 'name', subtitle: 'date', media: 'images.0' },
  },
})
