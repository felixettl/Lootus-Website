import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemaTypes'

// Singleton documents get a fixed id so there is only ever one of each.
const singletons = ['siteSettings']

export default defineConfig({
  name: 'lootus',
  title: 'Lootus Kollektiv',
  projectId: 'zgboj0ia',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Inhalt')
          .items([
            S.listItem()
              .title('Startseite & Texte')
              .id('siteSettings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.divider(),
            S.documentTypeListItem('event').title('Events'),
            S.documentTypeListItem('slide').title('Galerie (Slider)'),
            S.documentTypeListItem('member').title('Mitglieder'),
            S.documentTypeListItem('legalPage').title('Impressum & Datenschutz'),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({ schemaType }) => !singletons.includes(schemaType)),
  },
  document: {
    actions: (input, { schemaType }) =>
      singletons.includes(schemaType)
        ? input.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : input,
  },
})
