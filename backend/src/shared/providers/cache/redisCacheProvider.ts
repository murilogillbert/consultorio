import { CacheProvider } from './cacheProvider'

/**
 * Redis cache provider — not yet active (Redis not in node_modules).
 * Uses a simple in-memory Map as fallback for development.
 */
const memoryCache = new Map<string, { value: unknown; expiresAt?: number }>()

export class RedisCacheProvider implements CacheProvider {
  async get<T>(key: string): Promise<T | null> {
    const entry = memoryCache.get(key)
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryCache.delete(key)
      return null
    }
    return entry.value as T
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  async del(key: string): Promise<void> {
    memoryCache.delete(key)
  }
}
