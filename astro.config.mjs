import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://lootus.de',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [sitemap()],
  build: { assets: '_assets' },
  vite: { envDir: '.' },
})
