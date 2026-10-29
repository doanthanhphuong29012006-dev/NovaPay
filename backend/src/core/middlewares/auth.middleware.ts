import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config';
import { redisClient } from '../../config/redis.config';
import { UserRole } from '../../modules/auth/user.model';

export interface AuthenticatedUser {
    id: string;
    role: UserRole;
    jti: string;
    exp: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
            return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET) as {
            sub: string;
            role: UserRole;
            jti: string;
            exp: number;
        };

        const isBlackListed = await redisClient.get(`auth:blacklist:${decoded.jti}`);
        if (isBlackListed) {
            res.status(401).json({
                success: false,
                message: 'Phiên đăng nhập đã hết hạn hoặc đã đăng xuất.',
            });
            return;
        }

        req.user = {
            id: decoded.sub,
            role: decoded.role,
            jti: decoded.jti,
            exp: decoded.exp,
        };

        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Token không hợp lệ hoặc đã hết hạn.' 
        });
    }
}