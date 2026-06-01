import { Router } from 'express';
import authRouter from '../services/auth/router/auth.router';
import roomRouter from '../services/room/router/room.router';
import leaderboardRouter from '../services/leaderboard/router/leaderboard.router';

const router = Router();

router.use('/auth', authRouter);
router.use('/rooms', roomRouter);
router.use('/leaderboard', leaderboardRouter);

export default router;
