import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { requireAuth } from '../../../shared/middleware/auth.middleware';
import { authLimiter } from '../../../shared/middleware/rateLimit';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', requireAuth, authController.me);

export default router;
