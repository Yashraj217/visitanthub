const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const client = new Redis(REDIS_URL, {
  lazyConnect:         true,
  enableReadyCheck:    false,
  maxRetriesPerRequest: 1,
  connectTimeout:      2000,
  retryStrategy(times) {
    // Retry with capped backoff; stop after 10 failed attempts
    if (times > 10) return null;
    return Math.min(times * 500, 5000);
  },
});

client.on('connect',  () => console.log('[Redis] connected'));
client.on('error',    (e) => console.error('[Redis] error:', e.message));
client.on('close',    () => console.warn('[Redis] connection closed'));

client.connect().catch(() => {});

// Graceful get — returns null on any error so callers fall back to DB
async function cacheGet(key) {
  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

// Graceful set — silently fails if Redis is unavailable
async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {}
}

// Delete one or more keys
async function cacheDel(...keys) {
  try {
    if (keys.length) await client.del(...keys);
  } catch {}
}

module.exports = { client, cacheGet, cacheSet, cacheDel };
