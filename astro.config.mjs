import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://lootus.de',
  output: 'static',
  integrations: [sitemap()],
  build: { assets: '_assets' },
  vite: { envDir: '.' },
})
