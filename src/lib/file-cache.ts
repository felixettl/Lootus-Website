import { homedir } from 'node:os'
import path from 'node:path'

export const cacheRoot = path.join(homedir(), '.cache', 'lootus-website')

export function assertDriveId(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid Google Drive ID')
  return id
}