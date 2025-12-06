interface CacheEntry<T> {
  value: T;
  expires: number;
}

const cacheMap = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

function keyFromQuery(query: any): string {
  try {
    return JSON.stringify(query);
  } catch {
    return String(query);
  }
}

function set<T>(query: any, value: T, ttl: number = DEFAULT_TTL): void {
  const key = keyFromQuery(query);
  const expires = Date.now() + ttl;
  cacheMap.set(key, { value, expires });
}

function get<T>(query: any): T | undefined {
  const key = keyFromQuery(query);
  const entry = cacheMap.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expires) {
    cacheMap.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function clear(): void {
  cacheMap.clear();
}

const cache = { get, set, clear };
export default cache;
