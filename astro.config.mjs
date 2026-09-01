import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://lootus.de',
  build: { assets: '_assets' },
  vite: { envDir: '.' },
})
