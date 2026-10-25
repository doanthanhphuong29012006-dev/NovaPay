import { randomUUID } from 'crypto';
import mongoose, { Types } from 'mongoose';
import { Database } from '../src/config/database.config';
import { redisClient, redisManager } from '../src/config/redis.config';
import { WalletModel, WalletStatus } from '../src/modules/wallet/wallet.model';
import {
    TransactionModel,
    LedgerEntryModel,
    TransactionType,
    TransactionStatus,
    EntryType,
} from '../src/modules/ledger/ledger.model';
import { WalletService } from '../src/modules/wallet/wallet.service';
import { env } from '../src/config/env.config';

const API_URL = `http://localhost:${env.PORT}/api/v1/wallets`;
const walletService = new WalletService();

//Hàm khởi tạo 2 ví mẫu với số dư ban đầu và ghi bút toán nạp tiền gốc vào Sổ cái
async function setupTestWallets(initialBalanceA: number, initialBalanceB: number) {
    // Xóa dữ liệu test cũ
    await Promise.all([
        WalletModel.deleteMany({}),
        TransactionModel.deleteMany({}),
        LedgerEntryModel.deleteMany({}),
        redisClient.flushall(),
    ]);

    const walletAId = new Types.ObjectId();
    const walletBId = new Types.ObjectId();

    // Tạo 2 ví
    await WalletModel.create([
        {
            _id: walletAId,
            userId: new Types.ObjectId(),
            currency: 'VND',
            balance: initialBalanceA,
            status: WalletStatus.ACTIVE,
        },
        {
            _id: walletBId,
            userId: new Types.ObjectId(),
            currency: 'VND',
            balance: initialBalanceB,
            status: WalletStatus.ACTIVE,
        },
    ]);

    // Ghi bút toán CREDIT khởi tạo vào sổ cái
    const seedTx = await TransactionModel.create({
        idempotencyKey: `seed-${randomUUID()}`,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.SUCCESS,
        amount: initialBalanceA + initialBalanceB,
        currency: 'VND',
        description: 'Nạp tiền khởi tạo phục vụ Concurrency Test',
    });

    const seedEntries = [];
    if (initialBalanceA > 0) {
        seedEntries.push({
            transactionId: seedTx._id,
            walletId: walletAId,
            type: EntryType.CREDIT,
            amount: initialBalanceA,
            balanceBefore: 0,
            balanceAfter: initialBalanceA,
        });
    }
    if (initialBalanceB > 0) {
        seedEntries.push({
            transactionId: seedTx._id,
            walletId: walletBId,
            type: EntryType.CREDIT,
            amount: initialBalanceB,
            balanceBefore: 0,
            balanceAfter: initialBalanceB,
        });
    }
    if (seedEntries.length > 0) {
        await LedgerEntryModel.insertMany(seedEntries);
    }

    return {
        walletAId: walletAId.toString(),
        walletBId: walletBId.toString(),
    };
}

//Helper gửi HTTP POST chuyển tiền
async function sendTransferRequest(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    idempotencyKey: string
) {
    const response = await fetch(`${API_URL}/transfer`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
            fromWalletId,
            toWalletId,
            amount,
            description: 'Test Concurrency Transfer',
        }),
    });

    const data = await response.json();
    return {
        status: response.status,
        replayed: response.headers.get('x-idempotency-replayed') === 'true',
        data,
    };
}

// TEST CASE 1: BẮN 100 REQUEST CÙNG LÚC (CHỐNG RACE CONDITION & OVERSPENDING)
async function runOverspendingTest() {
    console.log('\n================================================================');
    console.log('TEST 1: BẮN 100 REQUEST ĐỒNG THỜI (CHỐNG ÂM TIỀN / RACE CONDITION)');
    console.log('================================================================');

    // Ví A có 500,000 VND. Ví B có 0 VND.
    const INITIAL_BALANCE_A = 500_000;
    const TRANSFER_AMOUNT = 100_000;
    const TOTAL_CONCURRENT_REQUESTS = 100;
    const EXPECTED_SUCCESS_COUNT = 5; // 500k / 100k = tối đa 5 giao dịch thành công

    const { walletAId, walletBId } = await setupTestWallets(INITIAL_BALANCE_A, 0);

    console.log(`Trạng thái ban đầu:`);
    console.log(`   - Số dư Ví A: ${INITIAL_BALANCE_A.toLocaleString()} VND`);
    console.log(`   - Số dư Ví B: 0 VND`);
    console.log(
      `Đang bắn ${TOTAL_CONCURRENT_REQUESTS} request đồng thời (Mỗi request rút ${TRANSFER_AMOUNT.toLocaleString()} VND)...`
    );

    const startTime = Date.now();

    // Tạo mảng 100 Promises chạy song song cùng một lúc (mỗi request 1 Idempotency Key riêng)
    const requests = Array.from({ length: TOTAL_CONCURRENT_REQUESTS }, () =>
        sendTransferRequest(walletAId, walletBId, TRANSFER_AMOUNT, randomUUID())
    );

    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;

    const successResponses = results.filter((r) => r.status === 200);
    const failedResponses = results.filter((r) => r.status !== 200);

    // Kiểm tra dữ liệu thực tế trong Database sau bão request
    const [walletAAfter, walletBAfter, auditA, auditB] = await Promise.all([
        WalletModel.findById(walletAId),
        WalletModel.findById(walletBId),
        walletService.auditWallet(walletAId),
        walletService.auditWallet(walletBId),
    ]);

    console.log(`\nKẾT QUẢ SAU ${duration}ms:`);
    console.log(`   - Request thành công (HTTP 200): ${successResponses.length} / ${TOTAL_CONCURRENT_REQUESTS} (Kỳ vọng: ${EXPECTED_SUCCESS_COUNT})`);
    console.log(`   - Request bị chặn (Không đủ số dư): ${failedResponses.length} / ${TOTAL_CONCURRENT_REQUESTS} (Kỳ vọng: 95)`);
    console.log(`   - Số dư Ví A sau cùng: ${walletAAfter?.balance.toLocaleString()} VND (Kỳ vọng: 0 VND)`);
    console.log(`   - Số dư Ví B sau cùng: ${walletBAfter?.balance.toLocaleString()} VND (Kỳ vọng: 500,000 VND)`);
    console.log(`   - Đối soát Sổ cái Ví A: ${auditA.status} (Lệch: ${auditA.discrepancy})`);
    console.log(`   - Đối soát Sổ cái Ví B: ${auditB.status} (Lệch: ${auditB.discrepancy})`);

    // Assertions
    if (
        successResponses.length !== EXPECTED_SUCCESS_COUNT ||
        walletAAfter?.balance !== 0 ||
        walletBAfter?.balance !== INITIAL_BALANCE_A ||
        auditA.discrepancy !== 0 ||
        auditB.discrepancy !== 0
    ) {
        throw new Error('TEST 1 THẤT BẠI: Xảy ra lỗi Race Condition hoặc sai lệch sổ cái!');
    }

    console.log('TEST 1 PASSED: Không xảy ra Race Condition, ví không bị âm!');
}
// END TEST CASE 1: BẮN 100 REQUEST CÙNG LÚC (CHỐNG RACE CONDITION & OVERSPENDING)

// TEST CASE 2: CHỐNG GỬI TRÙNG GIAO DỊCH (IDEMPOTENCY KEY TEST)
async function runIdempotencyTest() {
    console.log('\n================================================================');
    console.log('TEST 2: BẮN 20 REQUEST TRÙNG IDEMPOTENCY KEY CÙNG LÚC');
    console.log('================================================================');

    const { walletAId, walletBId } = await setupTestWallets(1_000_000, 0);
    const sharedIdempotencyKey = `dup-key-${randomUUID()}`;

    console.log(`Đang bắn 20 request có CÙNG key "${sharedIdempotencyKey}" (Mỗi request 100,000 VND)...`);

    const requests = Array.from({ length: 20 }, () =>
        sendTransferRequest(walletAId, walletBId, 100_000, sharedIdempotencyKey)
    );

    const results = await Promise.all(requests);

    const executedCount = results.filter((r) => r.status === 200 && !r.replayed).length;
    const conflictCount = results.filter((r) => r.status === 409).length;
    const replayedCount = results.filter((r) => r.status === 200 && r.replayed).length;

    const walletAAfter = await WalletModel.findById(walletAId);

    console.log(`\nKẾT QUẢ IDEMPOTENCY:`);
    console.log(`   - Thực thi thật sự vào DB: ${executedCount} lần (Kỳ vọng: 1)`);
    console.log(`   - Bị chặn do đang xử lý (HTTP 409 Conflict): ${conflictCount} lần`);
    console.log(`   - Trả về từ Redis Cache (Replayed): ${replayedCount} lần`);
    console.log(`   - Số dư Ví A còn lại: ${walletAAfter?.balance.toLocaleString()} VND (Kỳ vọng: 900,000 VND)`);

    if (executedCount !== 1 || walletAAfter?.balance !== 900_000) {
        throw new Error('TEST 2 THẤT BẠI: Bị trừ tiền nhiều lần cho cùng 1 Idempotency Key!');
    }

    console.log('TEST 2 PASSED: Redis Idempotency chặn đứng 19 request trùng lặp!');
}
// END TEST CASE 2: CHỐNG GỬI TRÙNG GIAO DỊCH (IDEMPOTENCY KEY TEST)

// TEST CASE 3: CHUYỂN TIỀN CHÉO A <-> B CÙNG LÚC (CHỐNG DEADLOCK)
async function runDeadlockPreventionTest() {
    console.log('\n================================================================');
    console.log('TEST 3: 40 LUỒNG CHUYỂN CHÉO (A -> B VÀ B -> A) CHỐNG DEADLOCK');
    console.log('================================================================');

    // Cả 2 ví đều có 1,000,000 VND
    const { walletAId, walletBId } = await setupTestWallets(1_000_000, 1_000_000);

    console.log('Đang bắn đồng thời: 20 luồng (A -> B: 10,000đ) và 20 luồng (B -> A: 15,000đ)...');

    // 20 luồng A chuyển cho B (Tổng A giảm 200k, B tăng 200k)
    const aToBRequests = Array.from({ length: 20 }, () =>
        sendTransferRequest(walletAId, walletBId, 10_000, randomUUID())
    );

    // 20 luồng B chuyển ngược lại cho A (Tổng B giảm 300k, A tăng 300k)
    const bToARequests = Array.from({ length: 20 }, () =>
        sendTransferRequest(walletBId, walletAId, 15_000, randomUUID())
    );

    // Trộn lẫn và bắn cùng lúc
    const results = await Promise.all([...aToBRequests, ...bToARequests]);
    const allSucceeded = results.every((r) => r.status === 200);

    // Kỳ vọng sau cùng:
    // Ví A: 1,000,000 - 200,000 + 300,000 = 1,100,000 VND
    // Ví B: 1,000,000 + 200,000 - 300,000 = 900,000 VND
    const [walletAAfter, walletBAfter, auditA, auditB] = await Promise.all([
        WalletModel.findById(walletAId),
        WalletModel.findById(walletBId),
        walletService.auditWallet(walletAId),
        walletService.auditWallet(walletBId),
    ]);

    console.log(`\nKẾT QUẢ CHỐNG DEADLOCK:`);
    console.log(`   - Toàn bộ 40 giao dịch thành công: ${allSucceeded ? 'CÓ (40/40)' : 'KHÔNG'}`);
    console.log(`   - Số dư Ví A sau cùng: ${walletAAfter?.balance.toLocaleString()} VND (Kỳ vọng: 1,100,000 VND)`);
    console.log(`   - Số dư Ví B sau cùng: ${walletBAfter?.balance.toLocaleString()} VND (Kỳ vọng: 900,000 VND)`);
    console.log(`   - Tổng tiền toàn hệ thống: ${((walletAAfter?.balance || 0) + (walletBAfter?.balance || 0)).toLocaleString()} VND (Bảo toàn 2,000,000 VND)`);
    console.log(`   - Đối soát Sổ cái A & B: ${auditA.status} | ${auditB.status}`);

    if (
        !allSucceeded ||
        walletAAfter?.balance !== 1_100_000 ||
        walletBAfter?.balance !== 900_000 ||
        auditA.discrepancy !== 0 ||
        auditB.discrepancy !== 0
    ) {
        throw new Error('TEST 3 THẤT BẠI: Xảy ra Deadlock hoặc tính toán sai số dư khi chuyển chéo!');
    }

    console.log('TEST 3 PASSED: Không xảy ra Deadlock, bảo toàn tổng dòng tiền!');
}
// END TEST CASE 3: CHUYỂN TIỀN CHÉO A <-> B CÙNG LÚC (CHỐNG DEADLOCK)

// HÀM CHẠY TỔNG HỢP
async function main() {
    try {
        const db = Database.getInstance();
        await db.connect();

        await runOverspendingTest();
        await runIdempotencyTest();
        await runDeadlockPreventionTest();

        console.log('\nTẤT CẢ 3 BÀI KIỂM THỬ KHẮC NGHIỆT ĐỀU VƯỢT QUA XUẤT SẮC!\n');
    } catch (error) {
        console.error('\nBÀI TEST THẤT BẠI:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
        await redisManager.disconnect();
    }
}

main();
// END HÀM CHẠY TỔNG HỢP