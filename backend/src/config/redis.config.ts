import Redis from 'ioredis';
import Redlock from 'redlock';
import { env } from './env.config';

class RedisManager {
    public client: Redis;
    public redlock: Redlock;

    constructor() {
        this.client = new Redis({
            host: env.REDIS_HOST,
            port: env.REDIS_PORT,
            password: env.REDIS_PASSWORD,
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
            retryStrategy(times) {
                const delay = Math.min(times * 100, 3000);
                return delay;
            },
        });

        this.client.on('connect', () => {
            console.log('Đã kết nối Redis thành công.');
        });

        this.client.on('error', (err) => {
            console.error('Lỗi Redis Client:', err);
        });

        this.redlock = new Redlock([this.client as any], {
            driftFactor: 0.01,
            retryCount: 60,
            retryDelay: 100,
            retryJitter: 50,
        });
    }

    public async disconnect(): Promise<void> {
        await this.client.quit();
        console.log('Đã đóng kết nối Redis an toàn.');
    }
}

export const redisManager = new RedisManager();
export const redisClient = redisManager.client;
export const redlock: Redlock = redisManager.redlock;