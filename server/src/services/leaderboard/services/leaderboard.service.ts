import { leaderboardDAO, type LeaderboardDAO } from '../dao/leaderboard.dao';

export class LeaderboardService {
  constructor(private readonly dao: LeaderboardDAO) {}

  async getTopPlayers(limit = 50) {
    return this.dao.getTopPlayers(limit);
  }
}

export const leaderboardService = new LeaderboardService(leaderboardDAO);
