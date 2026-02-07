/**
 * Victory Dialog Component
 *
 * Displays game result (win/loss/draw) with character-specific messages in PvC
 * and color-based messages in PvP. Shows character images, piece counts, and margin.
 * Random message selected on open via useEffect to avoid hydration mismatch.
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import type { Player, GameMode } from '@/types/checkers.types'
import type { Character } from '@shared/characters'

interface VictoryDialogProps {
  open: boolean
  winner: Player | null
  blackCount: number
  redCount: number
  onPlayAgain: () => void
  onClose: () => void
  character: Character
  gameMode?: GameMode
}

const PVP_DRAW_MESSAGES = [
  "It's a perfect tie! Both players are equally matched!",
  'A draw in Checkers? Impressive strategic balance!',
  'The board is cleared: Neither side prevails. Rematch?',
  'A perfect stalemate! Want to break the tie?',
]

const PVP_WIN_MESSAGES: Record<string, string[]> = {
  red: [
    'Red dominates the board!',
    'A masterful victory for Red!',
    'Red captures the crown!',
    'Red outplayed Black beautifully!',
  ],
  black: [
    'Black dominates the board!',
    'A masterful victory for Black!',
    'Black captures the crown!',
    'Black outplayed Red beautifully!',
  ],
}

function VictoryDialogComponent({
  open,
  winner,
  blackCount,
  redCount,
  onPlayAgain,
  onClose,
  character,
  gameMode = 'pvc',
}: VictoryDialogProps) {
  const isDraw = winner === null
  const margin = Math.abs(blackCount - redCount)
  const [victoryMessage, setVictoryMessage] = useState('')
  const isPvP = gameMode === 'pvp'

  // Fallback to character avatar if themed image fails to load
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = character.avatar
  }

  // Select random message when dialog opens
  useEffect(() => {
    if (open) {
      let message: string
      if (isPvP) {
        if (isDraw) {
          message = PVP_DRAW_MESSAGES[Math.floor(Math.random() * PVP_DRAW_MESSAGES.length)]
        } else {
          const colorKey = winner === 1 ? 'red' : 'black'
          const msgs = PVP_WIN_MESSAGES[colorKey]
          message = msgs[Math.floor(Math.random() * msgs.length)]
        }
      } else {
        if (isDraw) {
          const drawMessages = [
            `It's a perfect tie! Both you and ${character.name} are equally matched!`,
            `A draw in Checkers? ${character.name} is impressed with your strategic balance!`,
            'The board is cleared: Neither side prevails. Rematch?',
            `Tied at the buzzer! ${character.name} wants a rematch to settle this!`,
            'A perfect stalemate! Want to break the tie?',
          ]
          message = drawMessages[Math.floor(Math.random() * drawMessages.length)]
        } else if (winner === 1) {
          const messages = character.catchphrases.playerWins
          message = messages[Math.floor(Math.random() * messages.length)]
        } else {
          const messages = character.catchphrases.characterWins
          message = messages[Math.floor(Math.random() * messages.length)]
        }
      }
      const timer = setTimeout(() => setVictoryMessage(message), 0)
      return () => clearTimeout(timer)
    }
  }, [open, isDraw, winner, character, isPvP])

  // Title text
  const titleText = isDraw
    ? '🤝 Draw!'
    : isPvP
      ? winner === 1
        ? 'Red Wins!'
        : 'Black Wins!'
      : winner === 1
        ? `You Beat ${character.name}!`
        : `${character.name} Wins!`

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {titleText}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {victoryMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Character Avatar (PvC only) */}
          {!isPvP && (
            <div className="flex items-center justify-center py-2">
              {winner === 1 ? (
                <img
                  src={character.loseImage}
                  alt={`${character.name} loses`}
                  className="max-h-40 w-auto object-contain"
                  onError={handleImageError}
                />
              ) : winner === 2 ? (
                <img
                  src={character.winImage}
                  alt={`${character.name} wins`}
                  className="max-h-40 w-auto object-contain"
                  onError={handleImageError}
                />
              ) : (
                <img
                  src={character.playAgainImage}
                  alt={`${character.name}`}
                  className="max-h-40 w-auto object-contain"
                  onError={handleImageError}
                />
              )}
            </div>
          )}

          {/* Visual Result Representation */}
          <div className="flex items-center justify-center gap-6 py-4">
            {winner === 1 ? (
              <>
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-red-600 to-red-800 shadow-2xl ring-4 ring-yellow-400 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-red-900 opacity-50" />
                  </div>
                  <div className="absolute -right-2 -top-2 text-4xl">👑</div>
                </div>
                <div className="text-5xl">🏆</div>
              </>
            ) : winner === 2 ? (
              <>
                {!isPvP && <div className="text-5xl opacity-50">😔</div>}
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-2xl ring-4 ring-yellow-400 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-gray-900 opacity-50" />
                  </div>
                  <div className="absolute -right-2 -top-2 text-4xl">👑</div>
                </div>
                {isPvP && <div className="text-5xl">🏆</div>}
              </>
            ) : (
              <>
                <div className="relative h-20 w-20">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-red-600 to-red-800 shadow-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-14 w-14 rounded-full bg-red-900 opacity-50" />
                  </div>
                </div>
                <div className="text-4xl">🤝</div>
                <div className="relative h-20 w-20">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-14 w-14 rounded-full bg-gray-900 opacity-50" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Final Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <div className="relative h-5 w-5">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-red-600 to-red-800 shadow-md" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-red-900 opacity-50" />
                  </div>
                </div>
                <span className="font-medium">{isPvP ? 'Red' : 'You (Red)'}</span>
              </div>
              <span className={`text-xl font-bold ${winner === 1 ? 'text-green-600' : ''}`}>
                {redCount}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <div className="relative h-5 w-5">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-md" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-gray-900 opacity-50" />
                  </div>
                </div>
                <span className="font-medium">{isPvP ? 'Black' : `${character.name} (Black)`}</span>
              </div>
              <span className={`text-xl font-bold ${winner === 2 ? 'text-green-600' : ''}`}>
                {blackCount}
              </span>
            </div>
            {!isDraw && (
              <div className="text-center text-sm text-muted-foreground">
                Margin: {margin} pieces
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button onClick={onPlayAgain} className="w-full sm:w-auto">
            Play Again
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const VictoryDialog = React.memo(VictoryDialogComponent)
