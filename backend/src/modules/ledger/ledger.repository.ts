import { ClientSession, Types } from 'mongoose';
import {
  TransactionModel,
  LedgerEntryModel,
  ITransaction,
  ILedgerEntry,
  EntryType,
} from './ledger.model';

export class LedgerRepository {
    public async createTransaction(data: Partial<ITransaction>, session: ClientSession): Promise<ITransaction> {
        const [transaction] = await TransactionModel.create([data], { session });
        return transaction;
    }

    public async createDoubleEntries(
        entries: Array<{
            transactionId: Types.ObjectId;
            walletId: Types.ObjectId;
            type: EntryType;
            amount: number;
            balanceBefore: number;
            balanceAfter: number;
        }>,
        session: ClientSession
    ): Promise<ILedgerEntry[]> {
        return LedgerEntryModel.insertMany(entries, { session });
    }

    public async calculateLedgerBalance(walletId: Types.ObjectId): Promise<number> {
        const result = await LedgerEntryModel.aggregate([
            {
                $match: { walletId }
            },
            {
                $group: {
                    _id: '$walletId',
                    totalCredit: {
                        $sum: { $cond: [{ $eq: ['$type', EntryType.CREDIT ] }, '$amount', 0]},
                    },
                    totalDebit: {
                        $sum: { $cond: [{ $eq: ['$type', EntryType.DEBIT ] }, '$amount', 0]},
                    },
                }
            },
            {
                $project: {
                    netBalance: { $subtract: ['$totalCredit', '$totalDebit'] },
                },
            },
        ]);

        return result.length > 0 ? result[0].netBalance : 0;
    }

    public async findByIdempotencyKey(
        idempotencyKey: string,
        session?: ClientSession
    ): Promise<ITransaction | null> {
        return TransactionModel.findOne({ idempotencyKey }).session(session || null);
    }
}