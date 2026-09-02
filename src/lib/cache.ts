// Simple in-memory, per-instance server cache with stale-while-revalidate refresh.
// Not shared across serverless instances/cold starts, but avoids redundant upstream
// calls (Drive/Sheets) for repeated requests hitting the same warm instance.

export const DEFAULT_TTL_MS = 15 * 60 * 1000

/**
 * Wraps a fetcher for a single shared value. The fetcher receives the previous value
 * so it can cheaply check upstream for changes and just return `previous` unchanged
 * (resetting the TTL) instead of redoing expensive work.
 */
export function createCache<T>(
  fetcher: (previous: T | undefined) => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
) {
  let value: T | undefined
  let updatedAt = 0
  let refreshing: Promise<void> | null = null

  async function refresh() {
    const next = await fetcher(value)
    value = next
    updatedAt = Date.now()
  }

  return async function get(): Promise<T> {
    if (value === undefined) {
      await refresh()
      return value as T
    }
    if (Date.now() - updatedAt >= ttlMs && !refreshing) {
      refreshing = refresh()
        .catch((err) => console.error('[cache] background refresh failed:', err))
        .finally(() => { refreshing = null })
    }
    return value
  }
}

/**
 * Same as createCache but keyed (e.g. by file/folder id), for endpoints fetching
 * per-resource data.
 */
export function createKeyedCache<K extends string, T>(
  fetcher: (key: K, previous: T | undefined) => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
) {
  interface Entry { value: T; updatedAt: number; refreshing: Promise<void> | null }
  const entries = new Map<K, Entry>()

  async function refresh(key: K) {
    const entry = entries.get(key)
    const next = await fetcher(key, entry?.value)
    entries.set(key, { value: next, updatedAt: Date.now(), refreshing: null })
  }

  return async function get(key: K): Promise<T> {
    const entry = entries.get(key)
    if (!entry) {
      await refresh(key)
      return entries.get(key)!.value
    }
    if (Date.now() - entry.updatedAt >= ttlMs && !entry.refreshing) {
      entry.refreshing = refresh(key).catch((err) =>
        console.error('[cache] background refresh failed:', err),
      )
    }
    return entry.value
  }
}
