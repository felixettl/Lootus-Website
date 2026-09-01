import { defineConfig } from 'astro/config'
import node from '@astrojs/node'

export default defineConfig({
  site: 'https://lootus.de',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  build: { assets: '_assets' },
  vite: { envDir: '.' },
})
