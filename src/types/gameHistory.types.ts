/**
 * Game History Type Definitions
 *
 * Exports: GameRecord, GameHistory.
 * Records are stored newest-first in localStorage, capped at MAX_GAME_HISTORY_RECORDS.
 * Result is always from Player 1 (Red) perspective.
 */

import type { GameMode, Difficulty, Player } from '@/types/checkers.types'

export interface GameRecord {
  id: string
  date: number
  mode: GameMode
  difficulty: Difficulty
  result: 'win' | 'loss' | 'draw'
  winner: Player | null
  moveCount: number
  redCount: number
  blackCount: number
  duration: number
}

export type GameHistory = GameRecord[]
