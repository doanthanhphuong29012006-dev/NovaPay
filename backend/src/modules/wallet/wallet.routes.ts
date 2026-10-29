import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import { verifyWebhookSignature } from '../../core/middlewares/webhookSignature.middleware';

const router = Router();
const walletController = new WalletController();

router.post('/transfer', idempotencyMiddleware, walletController.transfer);

router.get('/:id/audit', walletController.audit);

router.post('/deposit-webhook', verifyWebhookSignature, walletController.depositWebhook);

router.post('/:id/statements/export', walletController.requestStatement);

router.get('/statements/jobs/:jobId', walletController.getStatementStatus);

export default router;