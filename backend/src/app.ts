import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import walletRoutes from './modules/wallet/wallet.routes';

declare global {
    namespace Express {
        interface Request {
            rawBody?: Buffer;
        }
    }
}

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors());

app.use(express.json({
    verify: (req: Request, _res, buf: Buffer) => {
        req.rawBody = buf;
    },
}));

// API Health Check
app.get('/health', (_req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString() 
    });
});

app.use('/api/v1/wallets', walletRoutes);

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.message.includes('không đủ') || err.message.includes('không hợp lệ') ? 400 : 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Lỗi hệ thống nội bộ',
    });
});

export default app;