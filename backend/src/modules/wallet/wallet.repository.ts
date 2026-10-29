import { ClientSession, Types } from 'mongoose';
import { WalletModel, IWallet, WalletStatus } from './wallet.model';

export const SYSTEM_USER_ID = new Types.ObjectId('000000000000000000000001');
const SYSTEM_INITIAL_FLOAT = 1_000_000_000_000;

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

    public async getOrCreateSystemWallet(currency: string, session: ClientSession): Promise<IWallet> {
        let systemWallet = await WalletModel.findOne({
            userId: SYSTEM_USER_ID,
            currency,
        }).session(session);

        if (!systemWallet) {
            const [created] = await WalletModel.create(
                [
                    {
                        userId: SYSTEM_USER_ID,
                        currency,
                        balance: SYSTEM_INITIAL_FLOAT,
                        status: WalletStatus.ACTIVE,
                    },
                ],
                { session }
            );
            systemWallet = created;
        }

        return systemWallet;
    }

    public async createWallet(userId: Types.ObjectId, currency: string, session: ClientSession): Promise<IWallet> {
        const [wallet] = await WalletModel.create(
            [
                {
                    userId,
                    currency,
                    balance: 0,
                    status: WalletStatus.ACTIVE,
                },
            ],
            { session }
        );

        return wallet;
    }

    public async findByUserId(userId: string | Types.ObjectId): Promise<IWallet[]> {
        return WalletModel.find({ userId });
    }
}