import { Types } from "mongoose";
import { Database } from "../../config/database.config";
import { redlock } from "../../config/redis.config";
import { LedgerRepository } from "../ledger/ledger.repository";
import { WalletRepository } from "./wallet.repository";
import { WalletStatus } from "./wallet.model";
import { EntryType, TransactionStatus, TransactionType } from "../ledger/ledger.model";

export interface TransferMoneyDTO {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    description: string;
    idempotencyKey: string;
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
}