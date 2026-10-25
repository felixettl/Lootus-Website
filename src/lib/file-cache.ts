import { readdir, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

export const cacheRoot = path.join(homedir(), '.cache', 'lootus-website')
export const imageCacheDir = path.join(cacheRoot, 'images')

// Cached copies older than this are removed, so photos deleted from Sanity don't linger on the server.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000

async function removeCached(dir: string, id: string) {
  const files = await readdir(dir).catch(() => [] as string[])
  await Promise.all(
    files.filter((f) => f.startsWith(`${id}.`)).map((f) => rm(path.join(dir, f), { force: true })),
  )
}

async function pruneDir(dir: string, cutoff: number) {
  const files = await readdir(dir).catch(() => [] as string[])
  const newestById = new Map<string, number>()
  for (const file of files) {
    const id = file.slice(0, file.indexOf('.'))
    const { mtimeMs } = await stat(path.join(dir, file))
    newestById.set(id, Math.max(newestById.get(id) ?? 0, mtimeMs))
  }
  for (const [id, newest] of newestById) {
    if (newest < cutoff) await removeCached(dir, id)
  }
}

let lastPrune = 0

export function scheduleCachePrune() {
  const now = Date.now()
  if (now - lastPrune < PRUNE_INTERVAL_MS) return
  lastPrune = now
  const cutoff = now - MAX_AGE_MS
  pruneDir(imageCacheDir, cutoff).catch((error) => console.error('[cache] prune failed:', error))
}
