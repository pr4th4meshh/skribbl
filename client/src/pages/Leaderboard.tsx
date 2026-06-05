import { useLeaderboard } from '@/hooks/tanstack/leaderboard/useLeaderboard'
import { Navbar } from '@/components/layout/Navbar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export function Leaderboard() {
  const { data, isLoading } = useLeaderboard()

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {data && (
          <div className="flex flex-col gap-2">
            {data.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card"
              >
                <span className="w-6 text-center font-bold text-muted-foreground text-sm">
                  {i + 1}
                </span>
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{entry.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{entry.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.gamesPlayed} games · {entry.wins} wins
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm font-bold">
                  {entry.totalScore.toLocaleString()} pts
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
