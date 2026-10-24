import { Request, Response, NextFunction } from "express";
import { z } from 'zod';
import { WalletService } from "./wallet.service";

const transferSchema = z.object({
    fromWalletId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID ví gửi không hợp lệ'),
    toWalletId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID ví nhận không hợp lệ'),
    amount: z.number().int().positive('Số tiền phải là số nguyên lớn hơn 0'),
    description: z.string().min(1).max(255),
});

export class WalletController {
    constructor(private readonly walletService = new WalletService()) {}

    public transfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsedBody = transferSchema.parse(req.body);
            const idempotencyKey = req.headers['x-idempotency-key'] as string;

            if (!idempotencyKey) {
                res.status(400).json({ 
                    success: false, 
                    message: 'Thiếu Idempotency Key trong Header' 
                });
                return;
            }

            const result = await this.walletService.transferMoney({
                ...parsedBody,
                idempotencyKey,
            });

            res.status(200).json({
                success: true,
                message: "Chuyển tiền thành công",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    public audit = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.walletService.auditWallet(req.params.id as string);
            res.status(200).json({
                success: true,
                data: result,
            })
        } catch (error) {
            next(error);
        }
    }
}