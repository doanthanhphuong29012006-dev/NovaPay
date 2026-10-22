import mongoose, { Schema, Document, Types } from 'mongoose';

export enum TransactionType {
    DEPOSIT = 'DEPOSIT',
    WITHDRAW = 'WITHDRAW',
    TRANSFER = 'TRANSFER',
    REFUND = 'REFUND',
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export enum EntryType {
    DEBIT = 'DEBIT',
    CREDIT = 'CREDIT',
}

export interface ITransaction extends Document {
    _id: Types.ObjectId;
    idempotencyKey: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    currency: string;
    fromWalletId?: Types.ObjectId;
    toWalletId?: Types.ObjectId;
    description: string;
    createdAt: Date;
}

export interface ILedgerEntry extends Document {
    _id: Types.ObjectId;
    transactionId: Types.ObjectId;
    walletId: Types.ObjectId;
    type: EntryType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        idempotencyKey: { 
            type: String, 
            required: true, 
            unique: true, 
            index: true 
        },
        type: { 
            type: String, 
            enum: Object.values(TransactionType), 
            required: true 
        },
        status: { 
            type: String, 
            enum: Object.values(TransactionStatus), 
            required: true 
        },
        amount: { 
            type: Number, 
            required: true, 
            min: 1 
        },
        currency: { 
            type: String, 
            required: true, 
            default: 'VND' 
        },
        fromWalletId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Wallet', 
            index: true 
        },
        toWalletId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Wallet', 
            index: true 
        },
        description: { 
            type: String, 
            required: true, 
            trim: true 
        },
    },
    { 
        timestamps: { 
        createdAt: true, 
        updatedAt: false 
        } 
    }
);

const LedgerEntrySchema = new Schema<ILedgerEntry>(
    {
        transactionId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Transaction', 
            required: true, 
            index: true 
        },
        walletId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Wallet', 
            required: true, 
            index: true 
        },
        type: { 
            type: String, 
            enum: Object.values(EntryType), 
            required: true 
        },
        amount: { 
            type: Number, 
            required: true, 
            min: 1 
        },
        balanceBefore: { 
            type: Number, 
            required: true, 
            min: 0 
        },
        balanceAfter: { 
            type: Number, 
            required: true, 
            min: 0 
        },
    },
    { 
        timestamps: { 
            createdAt: true, 
            updatedAt: false 
        } 
    }
);

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema);
export const LedgerEntryModel = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);