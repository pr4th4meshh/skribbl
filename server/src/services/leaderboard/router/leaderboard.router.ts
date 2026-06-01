import { Router } from 'express';
import { leaderboardController } from '../controller/leaderboard.controller';

const router = Router();

router.get('/', leaderboardController.getLeaderboard);

export default router;
