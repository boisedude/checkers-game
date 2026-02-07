/**
 * Game Controls Component
 *
 * Two-row control bar. Top: difficulty selector (PvC only), New Game, Undo, Stats, Help.
 * Bottom: Achievements, History, Change Mode. Undo button only visible during gameplay.
 */

import React from 'react'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { CounterClockwiseClockIcon } from '@radix-ui/react-icons'
import type { Difficulty, GameMode, GameStatus } from '@/types/checkers.types'

interface GameControlsProps {
  difficulty: Difficulty
  onDifficultyChange: (difficulty: Difficulty) => void
  onNewGame: () => void
  onShowLeaderboard: () => void
  onShowHelp?: () => void
  onShowAchievements?: () => void
  onShowHistory?: () => void
  onReturnToSetup?: () => void
  onUndo?: () => void
  canUndo?: boolean
  disabled?: boolean
  gameMode: GameMode
  gameStatus?: GameStatus
}

export const GameControls = React.memo(function GameControls({
  difficulty,
  onDifficultyChange,
  onNewGame,
  onShowLeaderboard,
  onShowHelp,
  onShowAchievements,
  onShowHistory,
  onReturnToSetup,
  onUndo,
  canUndo = false,
  disabled = false,
  gameMode,
  gameStatus = 'playing',
}: GameControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-6">
      {/* Top Row: Difficulty and Action Buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4">
        {gameMode === 'pvc' && (
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <label htmlFor="difficulty" className="text-xs sm:text-sm font-medium whitespace-nowrap">
              Your Opponent:
            </label>
            <Select
              value={difficulty}
              onValueChange={value => onDifficultyChange(value as Difficulty)}
            >
              <SelectTrigger id="difficulty" className="w-full sm:w-52 h-10 sm:h-auto text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Bella - Playful Pup</SelectItem>
                <SelectItem value="medium">Coop - Casual Challenger</SelectItem>
                <SelectItem value="hard">Bentley - The Mastermind</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={onNewGame}
            disabled={disabled}
            variant="default"
            className="flex-1 sm:flex-none h-10 sm:h-auto text-sm sm:text-base"
          >
            New Game
          </Button>

          {/* Undo Button - only show during gameplay */}
          {onUndo && gameStatus === 'playing' && (
            <Button
              onClick={onUndo}
              disabled={disabled || !canUndo}
              variant="outline"
              className="flex-1 sm:flex-none h-10 sm:h-auto text-sm sm:text-base gap-1"
              aria-label="Undo last move (U)"
              title="Undo (U)"
            >
              <CounterClockwiseClockIcon className="h-4 w-4" />
              Undo
            </Button>
          )}

          <Button
            onClick={onShowLeaderboard}
            disabled={disabled}
            variant="outline"
            className="flex-1 sm:flex-none h-10 sm:h-auto text-sm sm:text-base"
          >
            Stats
          </Button>

          {onShowHelp && (
            <Button
              onClick={onShowHelp}
              disabled={disabled}
              variant="outline"
              className="flex-1 sm:flex-none h-10 sm:h-auto text-sm sm:text-base"
            >
              Help
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Row: Achievements, History, Return to Setup */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onShowAchievements && (
          <Button
            onClick={onShowAchievements}
            disabled={disabled}
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm"
          >
            Achievements
          </Button>
        )}

        {onShowHistory && (
          <Button
            onClick={onShowHistory}
            disabled={disabled}
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm"
          >
            History
          </Button>
        )}

        {onReturnToSetup && (
          <Button
            onClick={onReturnToSetup}
            disabled={disabled}
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm"
          >
            Change Mode
          </Button>
        )}
      </div>

    </div>
  )
})
