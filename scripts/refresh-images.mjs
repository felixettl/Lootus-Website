#!/usr/bin/env node
// Deletes cached image/gallery blobs so the next request re-fetches fresh data from Drive.
// Usage:
//   npm run refresh-images              -> clears everything (images/ + gallery/)
//   npm run refresh-images -- <fileId>  -> clears only the given Drive file id(s)
import { list, del } from '@vercel/blob'

const token = process.env.BLOB_READ_WRITE_TOKEN
if (!token) {
  console.error('BLOB_READ_WRITE_TOKEN not set (run with `node --env-file=.env.local` or export it first).')
  process.exit(1)
}

const fileIds = process.argv.slice(2)

async function listAll(prefix) {
  const blobs = []
  let cursor
  do {
    const res = await list({ token, prefix, cursor })
    blobs.push(...res.blobs)
    cursor = res.hasMore ? res.cursor : undefined
  } while (cursor)
  return blobs
}

async function main() {
  let pathnames
  if (fileIds.length > 0) {
    pathnames = fileIds.flatMap((id) => [`images/${id}`, `images/${id}.json`])
  } else {
    const [images, gallery] = await Promise.all([listAll('images/'), listAll('gallery/')])
    pathnames = [...images, ...gallery].map((b) => b.pathname)
  }

  if (pathnames.length === 0) {
    console.log('Nothing to delete.')
    return
  }

  await del(pathnames, { token })
  console.log(`Deleted ${pathnames.length} blob(s):`)
  pathnames.forEach((p) => console.log(`  - ${p}`))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
