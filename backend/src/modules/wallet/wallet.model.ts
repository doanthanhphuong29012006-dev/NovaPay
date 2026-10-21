import mongoose, { Schema, Document, Types } from 'mongoose';

export enum WalletStatus {
    ACTIVE = 'ACTIVE',
    FROZEN = 'FROZEN',
}

export interface IWallet extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    currency: string;
    balance: number;
    status: WalletStatus;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
    {
        userId: { 
            type: Schema.Types.ObjectId, 
            ref: 'User', 
            required: true, 
            index: true 
        },
        currency: { 
            type: String, 
            required: true, 
            default: 'VND', 
            uppercase: true 
        },
        balance: {
            type: Number,
            required: true,
            default: 0,
            min: [0, 'Số dư ví không bao giờ được âm'],
            validate: {
                validator: Number.isInteger,
                message: 'Số tiền phải là số nguyên để tránh sai số thập phân',
            },
        },
        status: {
            type: String,
            enum: Object.values(WalletStatus),
            default: WalletStatus.ACTIVE,
        },
    },
    {
        timestamps: true,
        optimisticConcurrency: true,
        versionKey: 'version',
    }
);

WalletSchema.index({ userId: 1, currency: 1 }, { unique: true });

export const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema);