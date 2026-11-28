import { defineField, defineType } from 'sanity'

export const shopLegalDocuments = defineType({
  name: 'shopLegalDocuments',
  title: 'Rechtliche Shop-Dokumente',
  type: 'document',
  fields: [
    defineField({
      name: 'agbPdf',
      title: 'Allgemeine Geschäftsbedingungen (PDF)',
      description: 'Finales, rechtlich geprüftes AGB-Dokument für den Online-Shop.',
      type: 'file',
      options: { accept: 'application/pdf' },
    }),
    defineField({
      name: 'widerrufsbelehrungPdf',
      title: 'Widerrufsbelehrung (PDF)',
      description: 'Finale Widerrufsbelehrung für Verbraucher.',
      type: 'file',
      options: { accept: 'application/pdf' },
    }),
    defineField({
      name: 'musterWiderrufsformularPdf',
      title: 'Muster-Widerrufsformular (PDF)',
      type: 'file',
      options: { accept: 'application/pdf' },
    }),
    defineField({
      name: 'versandZahlungPdf',
      title: 'Versand- und Zahlungsbedingungen (PDF)',
      type: 'file',
      options: { accept: 'application/pdf' },
    }),
    defineField({
      name: 'datenschutzShopPdf',
      title: 'Datenschutzhinweise für den Shop (PDF)',
      type: 'file',
      options: { accept: 'application/pdf' },
    }),
  ],
  preview: { prepare: () => ({ title: 'Shop-Rechtsdokumente' }) },
})