export interface PublicRoom {
  id: number
  code: string
  name: string
  isPrivate: boolean
  maxPlayers: number
  rounds: number
  drawTime: number
  language: string
  status: string
  host: { username: string; avatar: string | null }
  createdAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}
