import { Queue } from 'bullmq';
import { env } from '../config/env.config';

export const STATEMENT_QUEUE_NAME = 'wallet-statement-export';

export interface StatementJobPayload {
    walletId: string;
    userEmail: string;
    fromDate: string;
    toDate: string; // ISO Date String
}

export interface StatementJobResult {
    filename: string;
    filePath: string;
    totalRecords: number;
    totalCredit: number;
    totalDebit: number;
    completedAt: string;
}

export const statementQueue = new Queue<StatementJobPayload, StatementJobResult>(
    STATEMENT_QUEUE_NAME,
    {
        connection: {
            host: env.REDIS_HOST,
            port: env.REDIS_PORT,
            password: env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: {
                age: 3600,
                count: 1000,
            },
            removeOnFail: {
                age: 24 * 3600,
            },
        },
    }
);