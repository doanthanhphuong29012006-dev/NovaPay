import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000').transform(Number),
    MONGO_URI: z.string().min(1, 'MONGO_URI là bắt buộc (cần có replicaSet=rs0)'),
    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: z.string().default('6379').transform(Number),
    REDIS_PASSWORD: z.string().optional(),
    JWT_SECRET: z.string().min(10, 'JWT_SECRET phải có ít nhất 10 ký tự'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error('Lỗi cấu hình biến môi trường:', parsedEnv.error.format());
    process.exit(1);
}

export const env = parsedEnv.data;