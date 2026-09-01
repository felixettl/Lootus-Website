import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'

export default defineConfig({
  site: 'https://lootus.de',
  output: 'server',
  adapter: vercel(),
  build: { assets: '_assets' },
  vite: { envDir: '.' },
})
