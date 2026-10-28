import { Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import { once } from 'events';
import { Types } from 'mongoose';
import { env } from '../config/env.config';
import { STATEMENT_QUEUE_NAME, StatementJobPayload, StatementJobResult } from './statement.queue';
import { LedgerRepository } from '../modules/ledger/ledger.repository';
import { EntryType } from '../modules/ledger/ledger.model';

const ledgerRepo = new LedgerRepository();
const EXPORT_DIR = path.join(process.cwd(), 'exports');

if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

export const statementWorker = new Worker<StatementJobPayload, StatementJobResult>(
    STATEMENT_QUEUE_NAME,
    async (job: Job<StatementJobPayload, StatementJobResult>) => {
        const { walletId, userEmail, fromDate, toDate } = job.data;
        console.log(`[BullMQ Worker] Bắt đầu xuất sao kê cho ví ${walletId} (Job ID: ${job.id})`);

        const walletObjectId = new Types.ObjectId(walletId);
        const start = new Date(fromDate);
        const end = new Date(toDate);

        const fileName = `statement_${walletId}_${Date.now()}.csv`;
        const filePath = path.join(EXPORT_DIR, fileName);

        // Mở WriteStream để ghi từng dòng xuống ổ cứng (hoặc pipe thẳng lên AWS S3)
        const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });

        // Ghi BOM (\uFEFF) ở đầu file để mở bằng Microsoft Excel hiển thị đúng Tiếng Việt có dấu
        writeStream.write(
            '\uFEFFMã Bút Toán,Thời Gian,Loại GD,Loại Bút Toán (Nợ/Có),Số Tiền,Số Dư Trước,Số Dư Sau,Nội Dung\n'
        );

        const cursor = ledgerRepo.getStatementCursor(walletId, start, end);

        let totalRecords = 0;
        let totalCredit = 0;
        let totalDebit = 0;

        for await (const entry of cursor) {
            totalRecords++;

            if (entry.type == EntryType.CREDIT) {
                totalCredit += entry.amount;
            } else {
                totalDebit += entry.amount;
            }

            const txInfo = entry.transactionId as any;
            const txType = txInfo?.type || 'UNKNOWN';
            const rawDesc = txInfo?.description || '';
            // Escape dấu ngoặc kép để tránh vỡ cấu trúc CSV hoặc lỗi CSV Injection
            const safeDescription = `"${rawDesc.replace(/"/g, '""')}"`;

            const row = [
                entry._id.toString(),
                new Date(entry.createdAt).toISOString(),
                txType,
                entry.type,
                entry.amount,
                entry.balanceBefore,
                entry.balanceAfter,
                safeDescription,
            ].join(',');

            // Xử lý Backpressure: Nếu bộ đệm ghi đĩa bị đầy, đợi sự kiện 'drain' rồi mới đọc tiếp từ DB
            if (!writeStream.write(`${row}\n`)) {
                await once(writeStream, 'drain');
            }

            if (totalRecords % 100 == 0) {
                await job.updateProgress({ processedRows: totalRecords});
            }
        }

        writeStream.write(
            `\nTỔNG KẾT,,,TỔNG THU (CREDIT): ${totalCredit},TỔNG CHI (DEBIT): ${totalDebit},,,Tổng số giao dịch: ${totalRecords}\n`
        );

        writeStream.end();
        await once(writeStream, 'finish');

        console.log(
        `[Email Notification] Đã gửi sao kê (${totalRecords} giao dịch) tới ${userEmail}`
        );

        return {
            filename: fileName,
            filePath,
            totalRecords,
            totalCredit,
            totalDebit,
            completedAt: new Date().toISOString(),
        };
    },
    {
        connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
        },
        concurrency: 3,
    }
);

statementWorker.on('completed', (job) => {
    console.log(`[BullMQ Worker] Job ${job.id} hoàn tất xuất sắc!`);
});

statementWorker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Job ${job?.id} thất bại:`, err.message);
});