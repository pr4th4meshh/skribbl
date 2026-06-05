export interface User {
  id: string
  username: string
  email: string
  avatar: string | null
  totalScore?: number
  gamesPlayed?: number
  wins?: number
}

export interface LeaderboardEntry {
  id: number
  username: string
  avatar: string | null
  totalScore: number
  gamesPlayed: number
  wins: number
}
