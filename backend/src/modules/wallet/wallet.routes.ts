import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import { verifyWebhookSignature } from '../../core/middlewares/webhookSignature.middleware';
// SỬA LỖI 1: Import authenticateJWT để xác thực token và gán req.user cho các routes cần đăng nhập
import { authenticateJWT } from '../../core/middlewares/auth.middleware';

const router = Router();
const walletController = new WalletController();

// SỬA LỖI 1: Bổ sung authenticateJWT trước idempotencyMiddleware để xác thực req.user trước khi thực hiện chuyển tiền
router.post('/transfer', authenticateJWT, idempotencyMiddleware, walletController.transfer);

// SỬA LỖI 1: Bổ sung authenticateJWT bảo vệ endpoint audit ví
router.get('/:id/audit', authenticateJWT, walletController.audit);

// Webhook từ bên thứ 3 (VNPAY, MOMO...) xác thực qua chữ ký webhookSignature
router.post('/deposit-webhook', verifyWebhookSignature, walletController.depositWebhook);

// SỬA LỖI 1: Bổ sung authenticateJWT bảo vệ endpoint yêu cầu xuất sao kê
router.post('/:id/statements/export', authenticateJWT, walletController.requestStatement);

// SỬA LỖI 1: Bổ sung authenticateJWT bảo vệ endpoint kiểm tra trạng thái job sao kê
router.get('/statements/jobs/:jobId', authenticateJWT, walletController.getStatementStatus);

export default router;
