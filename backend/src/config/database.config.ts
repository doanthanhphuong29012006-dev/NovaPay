import mongoose, { ClientSession } from 'mongoose';
import { env } from './env.config';

export class Database {
    private static instance: Database;

    private constructor() {}

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public async connect(): Promise<void> {
        try {
            mongoose.set('strictQuery', true);

            await mongoose.connect(env.MONGO_URI, {
            maxPoolSize: 20,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            writeConcern: {
                w: 'majority',
                j: true,
            },
            readPreference: 'primary',
            });

            console.log('Đã kết nối MongoDB Replica Set thành công.');

            mongoose.connection.on('error', (err) => {
            console.error('Lỗi kết nối MongoDB:', err);
            });
        } catch (error) {
            console.error('Không thể kết nối tới MongoDB:', error);
            process.exit(1);
        }
    }

    public async disconnect(): Promise<void> {
        await mongoose.connection.close();
        console.log('Đã đóng kết nối MongoDB an toàn.');
    }

    public static async runInTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
        try {
            let result!: T;
            await session.withTransaction(
                async () => {
                    result = await work(session);
                },
                {
                    readConcern: { level: 'snapshot' },
                    writeConcern: { w: 'majority' },
                    readPreference: 'primary',
                }
            );
            return result;
        } finally {
            await session.endSession();
        }
    }
}