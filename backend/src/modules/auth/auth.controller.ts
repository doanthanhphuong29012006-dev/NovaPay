import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';

const registerSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
    fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(100),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const pinSchema = z.object({
    pin: z.string().regex(/^\d{6}$/, 'Mã PIN phải gồm đúng 6 chữ số'),
});

export class AuthController {
    constructor(private readonly authService = new AuthService()) {}

    public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body = registerSchema.parse(req.body);
            const result = await this.authService.register(body);
            res.status(201).json({ 
                success: true, 
                data: result 
            });
        } catch (error) {
            next(error);
        }
    };

    public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body = loginSchema.parse(req.body);
            const result = await this.authService.login(body);
            res.status(200).json({ 
                success: true, 
                data: result 
            });
        } catch (error) {
            next(error);
        }
    };

    public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id, jti, exp } = req.user!;
            await this.authService.logout(id, jti, exp);
            res.status(200).json({ 
                success: true, 
                message: 'Đăng xuất thành công.' 
            });
        } catch (error) {
            next(error);
        }
    };

    public setupPin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { pin } = pinSchema.parse(req.body);
            const result = await this.authService.setupTransactionPin(req.user!.id, pin);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.authService.getMyProfile(req.user!.id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };
}