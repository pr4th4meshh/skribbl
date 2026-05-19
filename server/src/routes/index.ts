import { Router } from 'express';
import authRouter from '../services/auth/router/auth.router';

const router = Router();

router.use('/auth', authRouter);

export default router;
