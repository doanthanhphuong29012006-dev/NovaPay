import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { Database } from '../../config/database.config';
import { redisClient } from '../../config/redis.config';
import { env } from '../../config/env.config';
import { UserModel, UserStatus } from './user.model';
import { WalletRepository } from '../wallet/wallet.repository';

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_SECONDS = 30 * 60;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600;

export class AuthService {
    constructor(private readonly walletRepo = new WalletRepository()) {}

    public async register(dto: { email: string; fullName: string; password: string }) {
        const existingUser = await UserModel.findOne({ email: dto.email.toLowerCase() });
        if (existingUser) {
            throw new Error('Email này đã được sử dụng.');
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        return Database.runInTransaction(async (session) => {
            const [newUser] = await UserModel.create(
                [
                    {
                        email: dto.email.toLowerCase(),
                        fullName: dto.fullName,
                        passwordHash,
                    },
                ],
                { session }
            );

            const defaultWallet = await this.walletRepo.createWallet(newUser._id, 'VND', session);

            return {
                user: {
                    id: newUser._id,
                    email: newUser.email,
                    fullName: newUser.fullName,
                }, 
                wallet: {
                    id: defaultWallet._id,
                    currency: defaultWallet.currency,
                    balance: defaultWallet.balance,
                },
            };
        });
    }

    public async login(dto: { email: string; password: string }) {
        const user = await UserModel.findOne({ email: dto.email.toLowerCase() }).select('+passwordHash');
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
            throw new Error('Email hoặc mật khẩu không chính xác.');
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new Error('Tài khoản của bạn đã bị khóa.');
        }

        const jwtID = randomUUID();
        const accessToken = jwt.sign(
            { sub: user._id.toString(), role: user.role, jwtID },
            env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
        );

        const refreshToken = randomUUID();
        await redisClient.set(
            `auth:refresh:${user._id.toString()}`,
            refreshToken,
            'EX',
            REFRESH_TOKEN_TTL_SECONDS
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        };
    }

    public async logout(userId: string, jwtID: string, exp: number) {
            const remainingSeconds = exp - Math.floor(Date.now() / 1000);
            if (remainingSeconds > 0) {
                await redisClient.set(`auth:blacklist:${jwtID}`, 'revoked', 'EX', remainingSeconds);
            }
            await redisClient.del(`auth:refresh:${userId}`)
    }

    public async setupTransactionPin(userId: string, rawPin: string) {
        if (!/^\d{6}$/.test(rawPin)) {
            throw new Error('Mã PIN giao dịch bắt buộc phải gồm đúng 6 chữ số.');
        }

        const pinHash = await bcrypt.hash(rawPin, 10);
        await UserModel.findByIdAndUpdate(userId, { pinHash });

        return { message: 'Thiết lập mã PIN giao dịch thành công.' };
    }

    public async verifyTransactionPin(userId: string, rawPin: string): Promise<void> {
        const attemptKey = `auth:pin_attempts:${userId}`;

        const currentAttempts = Number(await redisClient.get(attemptKey) || 0);
        if (currentAttempts >= MAX_PIN_ATTEMPTS) {
            const ttl = await redisClient.ttl(attemptKey);
            throw new Error(`Bạn đã nhập sai mã PIN quá ${MAX_PIN_ATTEMPTS} lần. Tính năng giao dịch bị tạm khóa trong ${Math.ceil(ttl / 60)} phút.`);
        }

        const user = await UserModel.findById(userId).select('+pinHash');
        if (!user || !user.pinHash) {
            throw new Error('Bạn chưa thiết lập mã PIN giao dịch. Vui lòng cài đặt mã PIN trước.');
        }

        const isMatch = await bcrypt.compare(rawPin, user.pinHash);
        if (!isMatch) {
            const newAttempts = await redisClient.incr(attemptKey);
            if (newAttempts === 1) {
                await redisClient.expire(attemptKey, PIN_LOCKOUT_SECONDS);
            }
            const remaining = Math.max(0, MAX_PIN_ATTEMPTS - newAttempts);
            throw new Error(`Mã PIN giao dịch không đúng. Bạn còn ${remaining} lần thử.`);
        }

        if (currentAttempts > 0) {
            await redisClient.del(attemptKey);
        }
    }

    public async getMyProfile(userId: string) {
        const [user, wallets] = await Promise.all([
            UserModel.findById(userId).select('+pinHash'),
            this.walletRepo.findByUserId(userId),
        ]);

        if (!user) throw new Error('Không tìm thấy người dùng.');

        return {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            hasSetupPin: Boolean(user.pinHash),
            wallets,
        };
    }
}