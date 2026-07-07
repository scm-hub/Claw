import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
});

redis.on('connect', () => console.log('[Redis] connected'));
redis.on('error', (err) => console.error('[Redis] error:', err.message));

export default redis;
