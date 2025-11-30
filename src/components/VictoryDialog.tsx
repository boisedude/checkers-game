/**
 * Victory Dialog Component
 * Shows game result with Checkers-themed personality messages
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import type { Player } from '@/types/checkers.types'
import type { Character } from '../../../shared/characters'

interface VictoryDialogProps {
  open: boolean
  winner: Player | null
  blackCount: number
  whiteCount: number
  onPlayAgain: () => void
  onClose: () => void
  character: Character
}

export function VictoryDialog({
  open,
  winner,
  blackCount,
  whiteCount,
  onPlayAgain,
  onClose,
  character,
}: VictoryDialogProps) {
  const isDraw = winner === null
  const margin = Math.abs(blackCount - whiteCount)
  const [victoryMessage, setVictoryMessage] = useState('')

  // Select random message when dialog opens (in effect to comply with React 19 purity rules)
  // Math.random() must be called in effect, not during render, to maintain purity
  // setState in effect is intentional here - we're responding to dialog opening
  useEffect(() => {
    if (open) {
      if (isDraw) {
        const drawMessages = [
          `It's a perfect tie! Both you and ${character.name} are equally matched!`,
          `A draw in Checkers? ${character.name} is impressed with your strategic balance!`,
          'The board is cleared: Neither side prevails. Rematch?',
          `Tied at the buzzer! ${character.name} wants a rematch to settle this!`,
          'A perfect stalemate! Want to break the tie?',
        ]
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVictoryMessage(drawMessages[Math.floor(Math.random() * drawMessages.length)])
      } else if (winner === 1) {
        // Player won - use character's playerWins catchphrases
        const messages = character.catchphrases.playerWins
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVictoryMessage(messages[Math.floor(Math.random() * messages.length)])
      } else {
        // Character won - use character's characterWins catchphrases
        const messages = character.catchphrases.characterWins
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVictoryMessage(messages[Math.floor(Math.random() * messages.length)])
      }
    }
  }, [open, isDraw, winner, character])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {isDraw ? '🤝 Draw!' : winner === 1 ? `You Beat ${character.name}!` : `${character.name} Wins!`}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {victoryMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Character Avatar */}
          <div className="flex items-center justify-center py-2">
            {winner === 1 ? (
              <img
                src={character.loseImage}
                alt={`${character.name} loses`}
                className="max-h-40 w-auto object-contain"
                onError={(e) => {
                  // Fallback to avatar if specific image not found
                  e.currentTarget.src = character.avatar
                }}
              />
            ) : winner === 2 ? (
              <img
                src={character.winImage}
                alt={`${character.name} wins`}
                className="max-h-40 w-auto object-contain"
                onError={(e) => {
                  // Fallback to avatar if specific image not found
                  e.currentTarget.src = character.avatar
                }}
              />
            ) : (
              <img
                src={character.playAgainImage}
                alt={`${character.name}`}
                className="max-h-40 w-auto object-contain"
                onError={(e) => {
                  // Fallback to avatar if specific image not found
                  e.currentTarget.src = character.avatar
                }}
              />
            )}
          </div>

          {/* Visual Result Representation - Checkers themed */}
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
                <div className="text-5xl opacity-50">😔</div>
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-2xl ring-4 ring-yellow-400 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-gray-900 opacity-50" />
                  </div>
                  <div className="absolute -right-2 -top-2 text-4xl">👑</div>
                </div>
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
                <span className="font-medium">You (Red)</span>
              </div>
              <span className={`text-xl font-bold ${winner === 1 ? 'text-green-600' : ''}`}>
                {blackCount}
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
                <span className="font-medium">{character.name} (Black)</span>
              </div>
              <span className={`text-xl font-bold ${winner === 2 ? 'text-green-600' : ''}`}>
                {whiteCount}
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
