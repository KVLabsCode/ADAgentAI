/**
 * Type-safe localStorage/sessionStorage utilities with error handling.
 *
 * Features:
 * - Type-safe get/set with generics
 * - Automatic JSON serialization
 * - Error handling with fallbacks
 * - SSR-safe (checks for window)
 * - Optional in-memory caching
 *
 * @example
 * import { storage, sessionStore } from '@/lib/storage'
 *
 * // Simple usage
 * storage.set('theme', 'dark')
 * const theme = storage.get('theme', 'light')
 *
 * // With objects
 * storage.set('user', { name: 'John', id: 1 })
 * const user = storage.get<User>('user', null)
 *
 * // Remove
 * storage.remove('theme')
 */

type StorageType = "local" | "session"

// In-memory cache for frequently accessed values
const cache = new Map<string, unknown>()

function isClient(): boolean {
  return typeof window !== "undefined"
}

function getStorage(type: StorageType): Storage | null {
  if (!isClient()) return null
  return type === "local" ? localStorage : sessionStorage
}

/**
 * Get a value from storage with type safety and error handling
 */
function get<T>(type: StorageType, key: string, fallback: T): T {
  // Check cache first
  const cacheKey = `${type}:${key}`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as T
  }

  const store = getStorage(type)
  if (!store) return fallback

  try {
    const item = store.getItem(key)
    if (item === null) return fallback

    // Try to parse as JSON, fall back to raw string
    try {
      const parsed = JSON.parse(item) as T
      cache.set(cacheKey, parsed)
      return parsed
    } catch {
      // Not JSON, return as string (cast to T)
      cache.set(cacheKey, item)
      return item as unknown as T
    }
  } catch (error) {
    console.warn(`[storage] Failed to get "${key}":`, error)
    return fallback
  }
}

/**
 * Set a value in storage with automatic JSON serialization
 */
function set<T>(type: StorageType, key: string, value: T): boolean {
  const store = getStorage(type)
  if (!store) return false

  try {
    const serialized = typeof value === "string" ? value : JSON.stringify(value)
    store.setItem(key, serialized)

    // Update cache
    const cacheKey = `${type}:${key}`
    cache.set(cacheKey, value)

    return true
  } catch (error) {
    console.warn(`[storage] Failed to set "${key}":`, error)
    return false
  }
}

/**
 * Remove a value from storage
 */
function remove(type: StorageType, key: string): boolean {
  const store = getStorage(type)
  if (!store) return false

  try {
    store.removeItem(key)

    // Clear from cache
    const cacheKey = `${type}:${key}`
    cache.delete(cacheKey)

    return true
  } catch (error) {
    console.warn(`[storage] Failed to remove "${key}":`, error)
    return false
  }
}

/**
 * Check if a key exists in storage
 */
function has(type: StorageType, key: string): boolean {
  const store = getStorage(type)
  if (!store) return false

  try {
    return store.getItem(key) !== null
  } catch {
    return false
  }
}

/**
 * Clear all items from storage (use with caution)
 */
function clear(type: StorageType): boolean {
  const store = getStorage(type)
  if (!store) return false

  try {
    store.clear()
    // Clear cache entries for this storage type
    for (const key of cache.keys()) {
      if (key.startsWith(`${type}:`)) {
        cache.delete(key)
      }
    }
    return true
  } catch (error) {
    console.warn(`[storage] Failed to clear ${type}Storage:`, error)
    return false
  }
}

/**
 * Clear the in-memory cache (useful for testing or logout)
 */
function clearCache(): void {
  cache.clear()
}

// localStorage utilities
export const storage = {
  get: <T>(key: string, fallback: T): T => get("local", key, fallback),
  set: <T>(key: string, value: T): boolean => set("local", key, value),
  remove: (key: string): boolean => remove("local", key),
  has: (key: string): boolean => has("local", key),
  clear: (): boolean => clear("local"),
}

// sessionStorage utilities
export const sessionStore = {
  get: <T>(key: string, fallback: T): T => get("session", key, fallback),
  set: <T>(key: string, value: T): boolean => set("session", key, value),
  remove: (key: string): boolean => remove("session", key),
  has: (key: string): boolean => has("session", key),
  clear: (): boolean => clear("session"),
}

// Export cache utilities for testing/logout
export const storageCache = {
  clear: clearCache,
}
