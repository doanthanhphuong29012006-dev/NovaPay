import { Request, Response, NextFunction } from "express";
import { success } from "zod";
import { redisClient } from "../../config/redis.config";

interface CachedIdempotencyData {
    status: 'PROCESSING' | 'COMPLETED';
    statusCode?: number;
    body?: unknown;
}

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    if (!idempotencyKey || idempotencyKey.trim().length < 8) {
        res.status(400).json({
            success: false,
            message: 'Thiếu hoặc không hợp lệ header X-Idempotency-Key (tối thiểu 8 ký tự)',
        });
        return;
    }

    const userId = (req as any).user?.id || 'anonymous';
    const redisKey = `idempotency:${userId}:${idempotencyKey}`;

    try {
        const initialPayload: CachedIdempotencyData = { status: 'PROCESSING' };

        const acquired = await redisClient.set(redisKey, JSON.stringify(initialPayload), 'EX', 86400, 'NX');

        if (!acquired) {
            const existingDataRaw = await redisClient.get(redisKey);
            if (existingDataRaw) {
                const existingData: CachedIdempotencyData = JSON.parse(existingDataRaw);

                if (existingData.status === 'PROCESSING') {
                    res.status(409).json({
                        success: false,
                        message: 'Giao dịch này đang được xử lý, vui lòng không thao tác lặp lại.',
                    });
                    return;
                }

                res.setHeader('X-Idempotency-Replayed', 'true');
                res.status(existingData.statusCode || 200).json(existingData.body);
                return;
            }
        }

        const originJson = res.json.bind(res);

        res.json = (body: unknown): Response => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const completedPayload: CachedIdempotencyData = {
                    status: 'COMPLETED',
                    statusCode: res.statusCode,
                    body,
                };

                redisClient.set(redisKey, JSON.stringify(completedPayload), 'EX', 86400).catch(console.error);
            } else {
                redisClient.del(redisKey).catch(console.error);
            }

            return originJson(body);
        };

        next();
    } catch (error) {
        next(error);
    }
}