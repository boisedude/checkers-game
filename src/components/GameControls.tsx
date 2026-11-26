/**
 * Game Controls Component
 *
 * One row: New game (the only primary button), Undo, Hint (against a character),
 * and a More menu that holds everything else.
 */

import React from 'react'
import { Button } from './ui/button'
import { MoreMenu } from '@shared/MoreMenu'
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
  const playing = gameStatus === 'playing'
  return (
    <div className="arcade-controls">
      <Button onClick={onNewGame} disabled={disabled} className="h-11 px-3.5 sm:px-5">
        New game
      </Button>

      {onUndo && playing && (
        <Button
          onClick={onUndo}
          disabled={disabled || !canUndo}
          variant="outline"
          className="h-11 px-3.5 sm:px-5"
          aria-label="Undo last move (U)"
          title="Undo (U)"
        >
          Undo
        </Button>
      )}

      {onHint && playing && (
        <Button
          onClick={onHint}
          disabled={disabled || !canHint || hintPending}
          variant="outline"
          className="h-11 px-3.5 sm:px-5"
          title="Show a suggested move (H)"
        >
          Hint
        </Button>
      )}

      <MoreMenu
        disabled={disabled}
        items={[
          onShowHelp && { label: 'How to play', onSelect: onShowHelp },
          { label: 'Stats', onSelect: onShowLeaderboard },
          onShowAchievements && { label: 'Achievements', onSelect: onShowAchievements },
          onShowHistory && { label: 'Game history', onSelect: onShowHistory },
          onReturnToSetup && { label: 'Change mode', onSelect: onReturnToSetup, separated: true },
        ]}
      />
    </div>
  )
})
