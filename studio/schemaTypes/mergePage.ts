import { defineArrayMember, defineField, defineType } from 'sanity'

export const mergePage = defineType({
  name: 'mergePage',
  title: 'Merch',
  type: 'document',
  fields: [
    defineField({
      name: 'bannerTitle',
      title: 'Banner-Text',
      description: 'Große Venus-Rising-Schrift links im Banner.',
      type: 'string',
      initialValue: 'MERCH',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'bannerImage',
      title: 'Banner-Bild',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'pieces',
      title: 'Pieces',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'piece',
          title: 'Piece',
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required() }),
            defineField({
              name: 'price',
              title: 'Preis in € (optional)',
              type: 'number',
              validation: (rule) => rule.min(0),
            }),
            defineField({
              name: 'colors',
              title: 'Farben',
              type: 'array',
              of: [
                defineArrayMember({
                  name: 'pieceColor',
                  title: 'Farbvariante',
                  type: 'object',
                  fields: [
                    defineField({ name: 'name', title: 'Farbname', type: 'string', validation: (rule) => rule.required() }),
                    defineField({
                      name: 'colorCode',
                      title: 'Farbcode (HEX)',
                      type: 'string',
                      description: 'Zum Beispiel #fba919.',
                      validation: (rule) => rule.required().regex(/^#[0-9a-fA-F]{6}$/),
                    }),
                    defineField({
                      name: 'front',
                      title: 'Vorderseite',
                      type: 'image',
                      options: { hotspot: true },
                      validation: (rule) => rule.required(),
                    }),
                    defineField({
                      name: 'back',
                      title: 'Rückseite',
                      type: 'image',
                      options: { hotspot: true },
                      validation: (rule) => rule.required(),
                    }),
                  ],
                  preview: {
                    select: { title: 'name', media: 'front', subtitle: 'colorCode' },
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: 'name', subtitle: 'price', media: 'colors.0.front' },
            prepare: ({ title, subtitle, media }) => ({
              title: title || 'Piece ohne Namen',
              subtitle: subtitle != null ? `${subtitle} €` : 'Kein Preis angegeben',
              media,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'closingImage',
      title: 'Bild unter den Pieces',
      type: 'image',
      options: { hotspot: true },
    }),
  ],
  preview: { prepare: () => ({ title: 'Merch' }) },
})
