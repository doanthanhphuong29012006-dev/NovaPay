import { Types } from "mongoose";
import { Database } from "../../config/database.config";
import { redlock } from "../../config/redis.config";
import { LedgerRepository } from "../ledger/ledger.repository";
import { WalletRepository } from "./wallet.repository";
import { WalletStatus } from "./wallet.model";
import { EntryType, TransactionStatus, TransactionType } from "../ledger/ledger.model";
import { StatementJobPayload, statementQueue } from "../../jobs/statement.queue";

export interface TransferMoneyDTO {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    description: string;
    idempotencyKey: string;
}

export interface DepositWebhookDTO {
    provider: string;
    providerTransactionId: string;
    targetWalletId: string;
    amount: number;
    currency: string;
    status: 'SUCCESS' | 'FAILED';
}

export class WalletService {
    constructor(
        private readonly walletRepo = new WalletRepository(),
        private readonly ledgerRepo = new LedgerRepository()
    ) {}

    public async transferMoney(dto: TransferMoneyDTO) {
        const { fromWalletId, toWalletId, amount, description, idempotencyKey } = dto;

        if (fromWalletId === toWalletId) {
            throw new Error('Không thể tự chuyển tiền cho ví của mình.');
        }

        if (!Number.isInteger(amount) || amount <= 0) {
            throw new Error('Số tiền phải là số nguyên dương');
        }

        const sortedWalletIds = [fromWalletId, toWalletId].sort();
        const lockResources = sortedWalletIds.map(id => `locks:wallet:${id}`);
        const lockTTL = 5000;

        const lock = await redlock.acquire(lockResources, lockTTL);

        try {
            const TransferResult = await Database.runInTransaction(async (session) => {
                const senderObjectId = new Types.ObjectId(fromWalletId);
                const receiverObjectId = new Types.ObjectId(toWalletId);

                const [senderWallet, receiverWallet] = await Promise.all([
                    this.walletRepo.findById(senderObjectId, session),
                    this.walletRepo.findById(receiverObjectId, session),
                ]);

                if (!senderWallet || !receiverWallet) {
                    throw new Error('Không tìm thấy ví người gửi hoặc ví người nhận.');
                }

                if (
                    senderWallet.status !== WalletStatus.ACTIVE ||
                    receiverWallet.status !== WalletStatus.ACTIVE
                ) {
                    throw new Error('Một trong hai ví đang bị đóng băng, không thể giao dịch.');
                }

                if (senderWallet.currency !== receiverWallet.currency) {
                    throw new Error('Hai ví không cùng đơn vị tiền tệ.');
                }

                if (senderWallet.balance < amount) {
                    throw new Error('Số dư trong ví không đủ để thực hiện giao dịch.');
                }

                const updatedSender = await this.walletRepo.debitBalance(
                    senderObjectId,
                    amount,
                    session
                );
                
                if (!updatedSender) {
                    throw new Error('Trừ tiền thất bại do số dư không đủ hoặc xung đột dữ liệu.');
                }

                const updatedReceiver = await this.walletRepo.creditBalance(
                    receiverObjectId,
                    amount,
                    session
                );

                if (!updatedReceiver) {
                    throw new Error('Cộng tiền cho người nhận thất bại');
                }

                const transaction = await this.ledgerRepo.createTransaction(
                    {
                        idempotencyKey,
                        type: TransactionType.TRANSFER,
                        status: TransactionStatus.SUCCESS,
                        amount,
                        currency: senderWallet.currency,
                        fromWalletId: senderObjectId,
                        toWalletId: receiverObjectId,
                        description,
                    },
                    session
                );

                await this.ledgerRepo.createDoubleEntries(
                    [
                        {
                            transactionId: transaction._id,
                            walletId: senderObjectId,
                            type: EntryType.DEBIT,
                            amount,
                            balanceBefore: senderWallet.balance,
                            balanceAfter: updatedSender.balance,
                        }, 
                        {
                            transactionId: transaction._id,
                            walletId: receiverObjectId,
                            type: EntryType.CREDIT,
                            amount,
                            balanceBefore: receiverWallet.balance,
                            balanceAfter: updatedReceiver.balance,
                        },
                    ],
                    session
                );

                return {
                    transactionId: transaction._id,
                    amount,
                    currency: senderWallet.currency,
                    senderBalanceAfter: updatedSender.balance,
                    createdAt: transaction.createdAt,
                };
            });
            
            return TransferResult;
        } finally {
            await lock.release().catch(err => {
                console.error('Lỗi khi giải phóng redlock: ', err);
            });
        }
    }

    public async auditWallet(walletId: string) {
        const objectId = new Types.ObjectId(walletId);
        const wallet = await this.walletRepo.findById(objectId);

        if (!wallet) {
            throw new Error('Không tìm thấy ví.');
        }

        const calculatedBalance = await this.ledgerRepo.calculateLedgerBalance(objectId);
        const isMatched = wallet.balance === calculatedBalance;

        return {
            walletId: wallet._id,
            currentBalance: wallet.balance,
            ledgerCalculatedBalance: calculatedBalance,
            discrepancy: wallet.balance - calculatedBalance,
            status: isMatched ? 'MATCHED (Toàn vẹn dữ liệu)' : 'MISMATCHED (Phát hiện sai lệch!)',
        }
    }

    public async processDepositWebhook(dto: DepositWebhookDTO) {
        const { provider, providerTransactionId, targetWalletId, amount, currency, status } = dto;

        const idempotencyKey = `webhook:${provider.toUpperCase()}:${providerTransactionId}`;

        if (status != 'SUCCESS') {
            return {
                alreadyProcessed: false,
                message: 'Giao dịch nạp tiền ở trạng thái FAILED từ cổng thanh toán, không cộng số dư.',
            };
        }

        const lockResources = [
            `locks:webhook:${idempotencyKey}`,
            `locks:wallet:${targetWalletId}`,
        ].sort();

        const lock = await redlock.acquire(lockResources, 5000);

        try {
            return await Database.runInTransaction(async (session) => {
                const existingTx = await this.ledgerRepo.findByIdempotencyKey(idempotencyKey, session);
                if (existingTx) {
                    return {
                        alreadyProcessed: true,
                        transactionId: existingTx._id,
                        amount: existingTx.amount,
                        message: 'Webhook này đã được xử lý trước đó (Idempotent Replay).',
                    };
                }

                const receiverObjectId = new Types.ObjectId(targetWalletId);

                const [userWallet, systemWallet] = await Promise.all([
                    this.walletRepo.findById(receiverObjectId, session),
                    this.walletRepo.getOrCreateSystemWallet(currency, session),
                ]);

                if (!userWallet) {
                    throw new Error('Không tìm thấy ví người dùng cần nạp tiền.');
                }

                if (userWallet.status !== WalletStatus.ACTIVE) {
                    throw new Error('Ví người dùng đang bị khóa, không thể nạp tiền.');
                }

                if (userWallet.currency !== currency) {
                    throw new Error('Loại tiền tệ từ Webhook không khớp với ví người dùng.');
                }

                const updatedSystemWallet = await this.walletRepo.debitBalance(
                    systemWallet._id,
                    amount,
                    session
                );
                if (!updatedSystemWallet) {
                    throw new Error('Ngân quỹ hệ thống (System Float) không đủ hạn mức đối ứng.');
                }

                const updatedUserWallet = await this.walletRepo.creditBalance(receiverObjectId, amount, session);
                if (!updatedUserWallet) {
                    throw new Error('Cộng tiền vào ví người dùng thất bại.');
                }

                const transaction = await this.ledgerRepo.createTransaction(
                    {
                        idempotencyKey,
                        type: TransactionType.DEPOSIT,
                        status: TransactionStatus.SUCCESS,
                        amount,
                        currency,
                        fromWalletId: systemWallet._id,
                        toWalletId: receiverObjectId,
                        description:`Nạp tiền qua ${provider} (Mã GD: ${providerTransactionId})`,
                    },
                    session
                );

                await this.ledgerRepo.createDoubleEntries(
                    [
                        {
                            transactionId: transaction._id,
                            walletId: systemWallet._id,
                            type: EntryType.DEBIT,
                            amount,
                            balanceBefore: systemWallet.balance,
                            balanceAfter: updatedSystemWallet.balance,
                        },
                        {
                            transactionId: transaction._id,
                            walletId: receiverObjectId,
                            type: EntryType.CREDIT,
                            amount,
                            balanceBefore: userWallet.balance,
                            balanceAfter: updatedUserWallet.balance,
                        },
                    ],
                    session
                );

                return {
                    alreadyProcessed: false,
                    transactionId: transaction._id,
                    walletId: updatedUserWallet._id,
                    amount,
                    newBalance: updatedUserWallet.balance,
                };
            });
        } finally {
            await lock.release().catch(() => {});
        }
    }

    public async requestStatementExport(payload: StatementJobPayload) {
        const wallet = await this.walletRepo.findById(payload.walletId);

        if (!wallet) {
            throw new Error('Không tìm thấy ví cần xuất sao kê.');
        }

        const fromDay = payload.fromDate.slice(0, 10);
        const toDay = payload.toDate.slice(0, 10);
        const customJobId = `export-${payload.walletId}-${fromDay}-${toDay}`;

        const existingJob = await statementQueue.getJob(customJobId);
        if (existingJob) {
            const state = await existingJob.getState();
            if (state === 'active' || state === 'waiting' || state === 'delayed') {
                return {
                    jobId: existingJob.id,
                    status: state,
                    message: 'Yêu cầu xuất sao kê của bạn đang được hệ thống xử lý.',
                };
            }

            await existingJob.remove();
        }

        const job = await statementQueue.add('generate-csv-statement', payload, {
            jobId: customJobId,
        });

        return {
            jobId: job.id,
            status: 'queued',
            message: 'Đã tiếp nhận yêu cầu xuất sao kê. Hệ thống đang xử lý ngầm.',
        };
    }

    public async getStatementJobStatus(jobId: string) {
        const job = await statementQueue.getJob(jobId);
        if (!job) {
            throw new Error('Không tìm thấy tiến trình xuất sao kê với mã này.');
        }

        const state = await job.getState();

        return {
            jobId: job.id,
            state,
            progress: job.progress,
            result: state === 'completed' ? job.returnvalue : null,
            faildReason: state === 'failed' ? job.failedReason : null,
        };
    }
}