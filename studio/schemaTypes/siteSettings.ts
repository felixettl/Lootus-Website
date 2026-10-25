import { defineField, defineType } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Startseite',
  type: 'document',
  fields: [
    defineField({
      name: 'introHi',
      title: 'Begrüßung (fett)',
      type: 'string',
      initialValue: 'Hi.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'introText',
      title: 'Intro-Text',
      description: 'Text unter „Hi.“ im Kopfbereich.',
      type: 'text',
      rows: 6,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: { prepare: () => ({ title: 'Startseite: Intro-Text' }) },
})
