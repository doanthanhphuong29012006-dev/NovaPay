import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';

const router = Router();
const walletController = new WalletController();

router.post('/transfer', idempotencyMiddleware, walletController.transfer);

router.get('/:id/audit', walletController.audit);

export default router;