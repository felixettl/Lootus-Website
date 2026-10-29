import { defineArrayMember, defineField, defineType } from 'sanity'

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'Über uns',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Überschrift', type: 'string', initialValue: 'Über uns' }),
    defineField({ name: 'seoDescription', title: 'Beschreibung (Meta)', type: 'string' }),
    defineField({
      name: 'body',
      title: 'Text',
      type: 'array',
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
