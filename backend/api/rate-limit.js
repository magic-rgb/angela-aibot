import crypto from "node:crypto";
import { createClient } from "redis";

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const DEFAULT_LIMIT = Number(process.env.RATE_LIMIT_MAX || 30);
const REDIS_URL = process.env.REDIS_URL || "";

let redis = null;
let redisReady = false;
let redisInit = null;

async function getRedis() {
  if (!REDIS_URL) return null;
  if (redisInit) return redisInit;
  redisInit = (async () => {
    try {
      redis = createClient({ url: REDIS_URL });
      redis.on("error", () => { redisReady = false; });
      await redis.connect();
      redisReady = true;
      return redis;
    } catch {
      redisReady = false;
      redis = null;
      return null;
    }
  })();
  return redisInit;
}

const memory = new Map();

function memoryLimit(key, limit, now) {
  const bucket = memory.get(key);
  if (!bucket || now - bucket.start >= WINDOW_MS) {
    memory.set(key, { start: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export async function allowRateLimit(key, limit = DEFAULT_LIMIT) {
  const now = Date.now();
  const client = await getRedis();
  if (!client || !redisReady) return memoryLimit(key, limit, now);

  const slot = Math.floor(now / WINDOW_MS);
  const redisKey = `angela:rl:${crypto.createHash("sha256").update(key).digest("hex")}:${slot}`;
  try {
    const count = await client.incr(redisKey);
    if (count === 1) await client.pExpire(redisKey, WINDOW_MS + 1000);
    return count <= limit;
  } catch {
    return memoryLimit(key, limit, now);
  }
}

export function rateLimitBackend() {
  return REDIS_URL ? "redis_or_memory_fallback" : "memory";
}
