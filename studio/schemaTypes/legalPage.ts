import { defineArrayMember, defineField, defineType } from 'sanity'

export const legalPage = defineType({
  name: 'legalPage',
  title: 'Rechtliche Seite',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Seite',
      type: 'string',
      options: {
        list: [
          { title: 'Impressum', value: 'impressum' },
          { title: 'Datenschutz', value: 'datenschutz' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'title', title: 'Überschrift (H1)', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'seoDescription', title: 'Beschreibung (Meta)', type: 'string' }),
    defineField({
      name: 'html',
      title: 'HTML-Inhalt',
      description: 'Gesamter Text als HTML (z. B. <h2>, <p>, <ul>). Wenn befüllt, werden die Abschnitte unten ignoriert.',
      type: 'text',
      rows: 30,
    }),
    defineField({
      name: 'sections',
      title: 'Abschnitte (nur wenn kein HTML-Inhalt)',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'section',
          title: 'Abschnitt',
          fields: [
            defineField({ name: 'heading', title: 'Überschrift', type: 'string', validation: (rule) => rule.required() }),
            defineField({
              name: 'anchor',
              title: 'Anker (optional)',
              description: 'z. B. „kontaktformular“ für Links wie /datenschutz#kontaktformular.',
              type: 'string',
            }),
            defineField({
              name: 'body',
              title: 'Text',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'block',
                  styles: [{ title: 'Normal', value: 'normal' }],
                  lists: [],
                  marks: {
                    decorators: [
                      { title: 'Fett', value: 'strong' },
                      { title: 'Kursiv', value: 'em' },
                    ],
                    annotations: [
                      {
                        name: 'link',
                        type: 'object',
                        title: 'Link',
                        fields: [
                          defineField({
                            name: 'href',
                            type: 'string',
                            title: 'URL (https://… oder mailto:…)',
                            validation: (rule) =>
                              rule.required().regex(/^(https?:\/\/|mailto:)/, { name: 'url' }),
                          }),
                        ],
                      },
                    ],
                  },
                }),
              ],
            }),
          ],
          preview: { select: { title: 'heading' } },
        }),
      ],
    }),
    defineField({
      name: 'credits',
      title: 'Credits (nur Impressum)',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'credit',
          fields: [
            defineField({ name: 'text', title: 'Text', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'instagramUrl', title: 'Instagram', type: 'url' }),
            defineField({ name: 'linkedinUrl', title: 'LinkedIn', type: 'url' }),
          ],
          preview: { select: { title: 'text' } },
        }),
      ],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'slug' } },
})
