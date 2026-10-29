import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.config';
import { Database } from './config/database.config';
import { redisManager } from './config/redis.config';
import { statementWorker } from './jobs/statement.worker';
import { statementQueue } from './jobs/statement.queue';

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString() 
    });
});

async function startServer() {
    const db = Database.getInstance();
    await db.connect();

    const server = app.listen(env.PORT, () => {
        console.log(`E-Wallet Service đang chạy tại http://localhost:${env.PORT}`);
    });

    const shutdown = async (signal: string) => {
        console.log(`\nNhận tín hiệu ${signal}. Bắt đầu đóng server an toàn...`);

        server.close(async () => {
        console.log('Đã ngừng nhận HTTP request mới.');
        try {
            await statementWorker.close();
            await statementQueue.close();

            await db.disconnect();
            await redisManager.disconnect();
            console.log('Hoàn tất quá trình tắt hệ thống.');
            process.exit(0);
        } catch (err) {
            console.error('Lỗi trong quá trình đóng kết nối:', err);
            process.exit(1);
        }
        });

        setTimeout(() => {
        console.error('Quá thời gian chờ (Timeout), buộc dừng tiến trình.');
        process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();