import { Request, Response, NextFunction } from "express";
import crypto from 'crypto';
import { env } from '../../config/env.config';

const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

export const verifyWebHookSignature = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const signatureHeader = req.headers['x-webhook-signature'] as string;
        const timestampHeader = req.headers['x-webhook-timestamp'] as string;

        if (!signatureHeader || !timestampHeader || !req.rawBody) {
            res.status(401).json({
                success: false,
                message: 'Từ chối truy cập: Thiếu chữ ký bảo mật hoặc Timestamp.',
            });
            return;
        }

        // Chống Replay Attack: Kiểm tra thời gian gửi gói tin
        const timestamp = parseInt(timestampHeader, 10);
        const now = Date.now();

        if (isNaN(timestamp) || Math.abs(now - timestamp) > MAX_WEBHOOK_AGE_MS) {
            res.status(401).json({
                success: false,
                message: 'Từ chối truy cập: Gói tin Webhook đã quá hạn (Replay Attack Detected).',
            });
            return;
        }

        // Tạo chuỗi dữ liệu chuẩn để băm: "<timestamp>.<raw_json_body>"
        const signedPayload = `${timestamp}.${req.rawBody.toString('utf8')}`;

        const expectedSignature = crypto
            .createHmac('sha256', env.WEBHOOK_SECRET)
            .update(signedPayload)
            .digest('hex');

        // So sánh chữ ký bằng timingSafeEqual để chống Timing Attack
        const signatureBuffer = Buffer.from(signatureHeader, 'utf8');
        const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

        if (
            signatureBuffer.length !== expectedBuffer.length ||
            !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
        ) {
            res.status(401).json({
                success: false,
                message: 'Từ chối truy cập: Chữ ký HMAC-SHA256 không hợp lệ!',
            });
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
}