import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import sitemap from '@astrojs/sitemap'

// Astro only copies .env values into process.env during `astro build`, but the server code reads
// process.env, so load them here for `astro dev` too. Real environment variables always win, and
// .env.local wins over .env. In production (Hetzner) the variables come from the hosting panel.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

export default defineConfig({
  site: 'https://lootuskollektiv.de',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [sitemap()],
  build: { assets: '_assets' },
  vite: { envDir: '.' },
})
