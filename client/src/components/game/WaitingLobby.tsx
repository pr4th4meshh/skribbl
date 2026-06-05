interface Props {
  roomCode: string
  isHost: boolean
  playerCount: number
  maxPlayers: number
}

export function WaitingLobby({ roomCode, isHost, playerCount, maxPlayers }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
      <div>
        <p className="text-2xl font-bold mb-1">Waiting for players…</p>
        <p className="text-sm text-muted-foreground">
          {isHost ? 'You need at least 2 players to start' : 'Host will start soon'}
        </p>
      </div>
      {isHost && (
        <div className="bg-muted rounded-2xl px-8 py-5">
          <p className="text-xs text-muted-foreground mb-1.5 tracking-wider uppercase">Room code</p>
          <p className="text-4xl font-black font-mono tracking-[0.3em] text-foreground">{roomCode}</p>
          <p className="text-xs text-muted-foreground mt-2">Share with friends</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {playerCount}/{maxPlayers} players joined
      </p>
    </div>
  )
}
