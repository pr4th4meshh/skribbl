import type { GameMode, WordDifficulty, Team, Language } from '@/types'

export const GAME_MODE_INFO: Record<GameMode, { label: string; description: string }> = {
  classic: { label: 'Classic', description: 'Letters reveal as time runs out' },
  hidden: { label: 'No hints', description: 'Only the word length is shown — no letters revealed' },
  speed: { label: 'Speed', description: 'Half the draw time and only 5s to pick a word' },
  combination: { label: 'Combination', description: 'Draw two words at once — guess both to score' },
  teams: { label: 'Teams', description: 'Red vs blue — only your teammates guess your drawing (4+ players)' },
}

export const WORD_DIFFICULTY_LABELS: Record<WordDifficulty, string> = {
  mixed: 'Mixed',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  english: 'English',
  spanish: 'Español',
  french: 'Français',
  german: 'Deutsch',
}

export const TEAM_STYLES: Record<Team, { label: string; text: string; bg: string; dot: string }> = {
  red: { label: 'Red', text: 'text-red-600', bg: 'bg-red-500/10', dot: 'bg-red-500' },
  blue: { label: 'Blue', text: 'text-blue-600', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
}

export const MIN_TEAMS_PLAYERS = 4
