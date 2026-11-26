/**
 * Game Controls Component
 *
 * One primary button (New game), outline buttons for Undo, Hint (games against a
 * character), Stats and How to play, and a quiet ghost row for Achievements, History
 * and Change mode. The page leaves How to play to the top bar's help button.
 */

import React from 'react'
import { Button } from './ui/button'
import type { GameStatus } from '@/types/checkers.types'

interface GameControlsProps {
  onNewGame: () => void
  onShowLeaderboard: () => void
  onShowHelp?: () => void
  onShowAchievements?: () => void
  onShowHistory?: () => void
  onReturnToSetup?: () => void
  onUndo?: () => void
  canUndo?: boolean
  onHint?: () => void
  canHint?: boolean
  hintPending?: boolean
  disabled?: boolean
  gameStatus?: GameStatus
}

export const GameControls = React.memo(function GameControls({
  onNewGame,
  onShowLeaderboard,
  onShowHelp,
  onShowAchievements,
  onShowHistory,
  onReturnToSetup,
  onUndo,
  canUndo = false,
  onHint,
  canHint = false,
  hintPending = false,
  disabled = false,
  gameStatus = 'playing',
}: GameControlsProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="arcade-controls">
        <Button onClick={onNewGame} disabled={disabled} className="h-11 px-3 sm:px-5">
          New game
        </Button>

        {onUndo && gameStatus === 'playing' && (
          <Button
            onClick={onUndo}
            disabled={disabled || !canUndo}
            variant="outline"
            className="h-11 px-3 sm:px-5"
            aria-label="Undo last move (U)"
            title="Undo (U)"
          >
            Undo
          </Button>
        )}

        {onHint && gameStatus === 'playing' && (
          <Button
            onClick={onHint}
            disabled={disabled || !canHint || hintPending}
            variant="outline"
            className="h-11 px-3 sm:px-5"
            aria-label="Hint: show a good move"
          >
            Hint
          </Button>
        )}

        <Button onClick={onShowLeaderboard} disabled={disabled} variant="outline" className="h-11 px-3 sm:px-5">
          Stats
        </Button>

        {onShowHelp && (
          <Button onClick={onShowHelp} disabled={disabled} variant="outline" className="h-11 px-3 sm:px-5">
            How to play
          </Button>
        )}
      </div>

      <div className="arcade-controls">
        {onShowAchievements && (
          <Button onClick={onShowAchievements} disabled={disabled} variant="ghost" className="h-11">
            Achievements
          </Button>
        )}
        {onShowHistory && (
          <Button onClick={onShowHistory} disabled={disabled} variant="ghost" className="h-11">
            History
          </Button>
        )}
        {onReturnToSetup && (
          <Button onClick={onReturnToSetup} disabled={disabled} variant="ghost" className="h-11">
            Change mode
          </Button>
        )}
      </div>
    </div>
  )
})
