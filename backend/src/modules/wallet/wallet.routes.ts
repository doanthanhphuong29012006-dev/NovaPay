import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import { verifyWebhookSignature } from '../../core/middlewares/webhookSignature.middleware';
import { authenticateJWT } from '../../core/middlewares/auth.middleware';

const router = Router();
const walletController = new WalletController();

router.post('/transfer', authenticateJWT, idempotencyMiddleware, walletController.transfer);

router.get('/:id/audit', authenticateJWT, walletController.audit);

router.post('/deposit-webhook', verifyWebhookSignature, walletController.depositWebhook);

router.post('/:id/statements/export', authenticateJWT, walletController.requestStatement);

router.get('/statements/jobs/:jobId', authenticateJWT, walletController.getStatementStatus);

export default router;
