import { Request, Response, NextFunction } from "express";
import { z } from 'zod';
import { WalletService } from "./wallet.service";

const transferSchema = z.object({
    fromWalletId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID ví gửi không hợp lệ'),
    toWalletId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID ví nhận không hợp lệ'),
    amount: z.number().int().positive('Số tiền phải là số nguyên lớn hơn 0'),
    description: z.string().min(1).max(255),
    pin: z.string().regex(/^\d{6}$/, 'Mã PIN phải gồm đúng 6 chữ số'),
});

const depositWebhookSchema = z.object({
    provider: z.enum(['VNPAY', 'MOMO', 'STRIPE', 'PAYOS']),
    providerTransactionId: z.string().min(5).max(100),
    targetWalletId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID ví nhận không hợp lệ'),
    amount: z.number().int().positive('Số tiền nạp phải là số nguyên dương'),
    currency: z.string().default('VND'),
    status: z.enum(['SUCCESS', 'FAILED']),
});

const exportStatementSchema = z.object({
    userEmail: z.string().email('Email nhận sao kê không hợp lệ'),
    fromDate: z.string().datetime({ message: 'fromDate phải chuẩn định dạng ISO 8601' }),
    toDate: z.string().datetime({ message: 'toDate phải chuẩn định dạng ISO 8601' }),
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
                currentUserId: req.user!.id,
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
            const result = await this.walletService.auditWallet(req.params.id as string, req.user!.id);
            res.status(200).json({
                success: true,
                data: result,
            })
        } catch (error) {
            next(error);
        }
    }

    public depositWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsedBody = depositWebhookSchema.parse(req.body);
            const result = await this.walletService.processDepositWebhook(parsedBody);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    public requestStatement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsedBody = exportStatementSchema.parse(req.body);
            const walletId = req.params.id as string ;

            const result = await this.walletService.requestStatementExport({ 
                currentUserId: req.user!.id,
                walletId, 
                ...parsedBody 
            });

            res.status(202).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    public getStatementStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.walletService.getStatementJobStatus(req.params.jobId as string, req.user!.id);

            res.status(200).json({
                success: true,
                data: result,
            })
        } catch (error) {
            next(error);
        }
    }
}
