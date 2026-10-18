import { Settings2 } from 'lucide-react'
import { effectiveDrawTime } from '@skribbl/shared'
import type { GameMode, WordDifficulty, Language } from '@/types'
import { GAME_MODE_INFO, WORD_DIFFICULTY_LABELS, LANGUAGE_LABELS, MIN_TEAMS_PLAYERS } from '@/utils/gameModes'
import { Button } from '@/components/ui/button'

interface Props {
  roomCode: string
  isHost: boolean
  playerCount: number
  maxPlayers: number
  mode: GameMode
  wordDifficulty: WordDifficulty
  customWordsOnly: boolean
  drawTime: number
  totalRounds: number
  language: Language
  onEditSettings?: () => void
}

export function WaitingLobby({
  roomCode,
  isHost,
  playerCount,
  maxPlayers,
  mode,
  wordDifficulty,
  customWordsOnly,
  drawTime,
  totalRounds,
  language,
  onEditSettings,
}: Props) {
  const minPlayers = mode === 'teams' ? MIN_TEAMS_PLAYERS : 2
  const modeInfo = GAME_MODE_INFO[mode] ?? GAME_MODE_INFO.classic

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
      <div>
        <p className="text-2xl font-bold mb-1">Waiting for players…</p>
        <p className="text-sm text-muted-foreground">
          {isHost ? `You need at least ${minPlayers} players to start` : 'Host will start soon'}
        </p>
      </div>
      {isHost && (
        <div className="bg-brand-yellow rounded-2xl px-6 sm:px-8 py-4 sm:py-5">
          <p className="text-xs text-brand-deep/70 mb-1.5 tracking-wider uppercase font-semibold">Room code</p>
          <p className="text-2xl sm:text-4xl font-black font-mono tracking-[0.2em] sm:tracking-[0.3em] text-brand-deep">{roomCode}</p>
          <p className="text-xs text-brand-deep/60 mt-2">Share with friends</p>
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold">{modeInfo.label} mode</p>
        <p className="text-xs text-muted-foreground">{modeInfo.description}</p>
        <p className="text-xs text-muted-foreground">
          {totalRounds} rounds · {effectiveDrawTime(mode, drawTime)}s draw time · {customWordsOnly ? 'Custom words only' : `${WORD_DIFFICULTY_LABELS[wordDifficulty] ?? 'Mixed'} words`} · {LANGUAGE_LABELS[language] ?? language}
        </p>
      </div>
      {isHost && onEditSettings && (
        <Button variant="outline" size="sm" onClick={onEditSettings} className="gap-1.5">
          <Settings2 className="w-3.5 h-3.5" />
          Change settings
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        {playerCount}/{maxPlayers} players joined
      </p>
    </div>
  )
}
