import { ClientSession, Types } from 'mongoose';
import { WalletModel, IWallet, WalletStatus } from './wallet.model';

export class WalletRepository {
    public async findById(walletId: string | Types.ObjectId, session?: ClientSession): Promise<IWallet | null> {
        return WalletModel.findById(walletId).session(session || null);
    }

    public async debitBalance(walletId: Types.ObjectId, amount: number, session: ClientSession): Promise<IWallet | null> {
        return WalletModel.findOneAndUpdate(
            {
                _id: walletId,
                status: WalletStatus.ACTIVE,
                balance: { $gte: amount }
            },
            {
                $inc: { balance: -amount, version: 1}
            },
            {
                new: true,
                session
            }
        )
    }

    public async creditBalance(walletId: Types.ObjectId, amount: number, session: ClientSession): Promise<IWallet | null> {
        return WalletModel.findOneAndUpdate(
            {
                _id: walletId,
                status: WalletStatus.ACTIVE
            },
            {
                $inc: { balance: amount, version: 1 },
            },
            { new: true, session }
        );
    }
}