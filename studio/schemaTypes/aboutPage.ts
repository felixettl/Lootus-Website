import { defineArrayMember, defineField, defineType } from 'sanity'

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'Über uns',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Überschrift', type: 'string', initialValue: 'Über uns' }),
    defineField({ name: 'seoDescription', title: 'Beschreibung (Meta)', type: 'string' }),
    defineField({
      name: 'sections',
      title: 'Text (Absätze)',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'aboutSection',
          title: 'Absatz',
          fields: [
            defineField({ name: 'heading', title: 'Überschrift', type: 'string', validation: (rule) => rule.required() }),
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
                            type: 'url',
                            title: 'URL',
                            validation: (rule) => rule.uri({ scheme: ['http', 'https', 'mailto'] }),
                          }),
                        ],
                      },
                    ],
                  },
                }),
              ],
            }),
            defineField({
              name: 'backgroundImage',
              title: 'Hintergrundbild (optional)',
              type: 'image',
              options: { hotspot: true },
            }),
            defineField({
              name: 'galleryImages',
              title: 'Anzeigebilder (optional)',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'image',
                  options: { hotspot: true },
                  fields: [defineField({ name: 'alt', title: 'Alternativtext', type: 'string' })],
                }),
              ],
            }),
          ],
          preview: { select: { title: 'heading' } },
        }),
      ],
    }),
    defineField({
      name: 'body',
      title: 'Alter Text (wird nur angezeigt, wenn keine Absätze angelegt sind)',
      type: 'array',
      hidden: true,
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Überschrift', value: 'h2' },
          ],
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
                    type: 'url',
                    title: 'URL',
                    validation: (rule) => rule.uri({ scheme: ['http', 'https', 'mailto'] }),
                  }),
                ],
              },
            ],
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Über uns' }) },
})
