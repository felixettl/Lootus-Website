import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import sitemap from '@astrojs/sitemap'

// Astro only copies .env values into process.env during `astro build`, but the server code reads
// process.env, so load them here for `astro dev` too. Real environment variables always win.
// In production (Hetzner) the variables come from the hosting panel.
try {
  process.loadEnvFile('.env')
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

export default defineConfig({
  site: 'https://lootuskollektiv.de',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [sitemap()],
  build: { assets: '_assets' },
  // Astro's built-in check compares against an internal URL that becomes "localhost" behind a
  // reverse proxy, rejecting every real submission. /api/contact verifies the Origin itself.
  security: { checkOrigin: false },
  vite: { envDir: '.' },
})
