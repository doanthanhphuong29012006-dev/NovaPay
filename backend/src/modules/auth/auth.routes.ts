import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateJWT } from '../../core/middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register);

router.post('/login', authController.login);

router.post('/logout', authenticateJWT, authController.logout);

router.post('/pin/setup', authenticateJWT, authController.setupPin);

router.get('/me', authenticateJWT, authController.getMe);

export default router;