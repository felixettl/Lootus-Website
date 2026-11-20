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
    defineField({
      name: 'seoDescription',
      title: 'Beschreibung in der Google-Suche',
      description: 'Text, der unter dem Seitentitel in den Suchergebnissen (und bei Link-Vorschauen) erscheint. Ideal: 120–160 Zeichen.',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().max(200).warning('Google kürzt Texte über ca. 160 Zeichen.'),
    }),
    defineField({
      name: 'footerTagline',
      title: 'Text ganz unten im Footer',
      description: 'Zeile in der Fußleiste, z. B. „Lootus Kollektiv aus Konstanz“.',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'showMembershipFormEmbed',
      title: 'Mitgliedsantrag auf der Website einbetten',
      description: 'Wenn deaktiviert, wird auf der Über-uns-Seite nur der direkte Button zum EasyVerein-Antrag angezeigt.',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'statutesPdf',
      title: 'Satzung (PDF)',
      description: 'PDF-Datei, die über den Satzung-Link im Footer heruntergeladen wird.',
      type: 'file',
      options: { accept: 'application/pdf' },
    }),
  ],
  preview: { prepare: () => ({ title: 'Startseite & Texte' }) },
})
