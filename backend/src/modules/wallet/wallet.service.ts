import { Types } from "mongoose";
import { Database } from "../../config/database.config";
import { redlock } from "../../config/redis.config";
import { LedgerRepository } from "../ledger/ledger.repository";
import { WalletRepository } from "./wallet.repository";
import { WalletStatus } from "./wallet.model";
import { EntryType, TransactionStatus, TransactionType } from "../ledger/ledger.model";
import { StatementJobPayload, statementQueue } from "../../jobs/statement.queue";
import { AuthService } from "../auth/auth.service";

export interface TransferMoneyDTO {
    currentUserId: string;
    pin: string;
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
        private readonly ledgerRepo = new LedgerRepository(),
        private readonly authService = new AuthService()
    ) {}

    public async transferMoney(dto: TransferMoneyDTO) {
        const { currentUserId, pin, fromWalletId, toWalletId, amount, description, idempotencyKey } = dto;

        await this.authService.verifyTransactionPin(currentUserId, pin);

        if (fromWalletId === toWalletId) {
            throw new Error('Không thể tự chuyển tiền cho ví của mình.');
        }

        if (!Number.isInteger(amount) || amount <= 0) {
            throw new Error('Số tiền phải là số nguyên dương');
        }

        const sortedWalletIds = [fromWalletId, toWalletId].sort();
        const lockResources = sortedWalletIds.map(id => `locks:wallet:${id}`);
        
        const lockTTL = 10000;

        return await (redlock as any).using(lockResources, lockTTL, async (signal: any) => {
            const TransferResult = await Database.runInTransaction(async (session) => {
                if (signal.aborted) {
                    throw new Error('Lock đã hết hạn hoặc bị hủy trong lúc xử lý giao dịch.');
                }

                const senderObjectId = new Types.ObjectId(fromWalletId);
                const receiverObjectId = new Types.ObjectId(toWalletId);

                const [senderWallet, receiverWallet] = await Promise.all([
                    this.walletRepo.findById(senderObjectId, session),
                    this.walletRepo.findById(receiverObjectId, session),
                ]);

                if (!senderWallet || !receiverWallet) {
                    throw new Error('Không tìm thấy ví người gửi hoặc ví người nhận.');
                }

                if (senderWallet.userId.toString() !== currentUserId) {
                    throw new Error('Truy cập bị từ chối: Bạn không có quyền chuyển tiền từ ví này.');
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
        });
    }

    public async auditWallet(walletId: string, currentUserId?: string) {
        const objectId = new Types.ObjectId(walletId);
        const wallet = await this.walletRepo.findById(objectId);

        if (!wallet) {
            throw new Error('Không tìm thấy ví.');
        }

        if (currentUserId && wallet.userId.toString() !== currentUserId) {
            throw new Error('Truy cập bị từ chối: Bạn không có quyền xem thông tin ví này.');
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

        const lockTTL = 10000;

        return await (redlock as any).using(lockResources, lockTTL, async (signal: any) => {
            return await Database.runInTransaction(async (session) => {
                if (signal.aborted) {
                    throw new Error('Lock đã hết hạn hoặc bị hủy trong lúc xử lý webhook nạp tiền.');
                }

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
        });
    }

    public async requestStatementExport(payload: StatementJobPayload & { currentUserId?: string }) {
        const wallet = await this.walletRepo.findById(payload.walletId);

        if (!wallet) {
            throw new Error('Không tìm thấy ví cần xuất sao kê.');
        }

        if (payload.currentUserId && wallet.userId.toString() !== payload.currentUserId) {
            throw new Error('Truy cập bị từ chối: Bạn không có quyền xuất sao kê từ ví này.');
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

        const job = await statementQueue.add('generate-csv-statement', {
            ...payload,
            userId: wallet.userId.toString(),
        }, {
            jobId: customJobId,
        });

        return {
            jobId: job.id,
            status: 'queued',
            message: 'Đã tiếp nhận yêu cầu xuất sao kê. Hệ thống đang xử lý ngầm.',
        };
    }

    public async getStatementJobStatus(jobId: string, currentUserId?: string) {
        const job = await statementQueue.getJob(jobId);
        if (!job) {
            throw new Error('Không tìm thấy tiến trình xuất sao kê với mã này.');
        }

        if (currentUserId) {
            if (job.data?.userId && job.data.userId !== currentUserId) {
                throw new Error('Truy cập bị từ chối: Bạn không có quyền xem trạng thái tiến trình này.');
            }
            if (!job.data?.userId && job.data?.walletId) {
                const wallet = await this.walletRepo.findById(job.data.walletId);
                if (wallet && wallet.userId.toString() !== currentUserId) {
                    throw new Error('Truy cập bị từ chối: Bạn không có quyền xem trạng thái tiến trình này.');
                }
            }
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