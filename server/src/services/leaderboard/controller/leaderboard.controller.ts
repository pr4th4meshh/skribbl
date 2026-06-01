import type { Request, Response, NextFunction } from 'express';
import { leaderboardService, type LeaderboardService } from '../services/leaderboard.service';
import { success } from '../../../shared/utils/response';

export class LeaderboardController {
  constructor(private readonly service: LeaderboardService) {}

  getLeaderboard = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getTopPlayers());
    } catch (err) {
      next(err);
    }
  };
}

export const leaderboardController = new LeaderboardController(leaderboardService);
