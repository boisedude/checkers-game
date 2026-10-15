/**
 * Victory Dialog Component
 *
 * Character art (one player), a one-line result, one catchphrase, and a single
 * muted line with the final piece count. Random message chosen on open.
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

const DRAW_MESSAGES = [
  'A tie. Nobody gets the last word.',
  'Nobody wins this one. Try again?',
  'Dead even. One more?',
]

const PVP_WIN_MESSAGES: Record<string, string[]> = {
  red: ['Red takes the board.', 'A clean win for Red.', 'Red outplayed Black.'],
  black: ['Black takes the board.', 'A clean win for Black.', 'Black outplayed Red.'],
}

function pick(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)]
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
  const isPvP = gameMode === 'pvp'
  const [message, setMessage] = useState('')

  // Fallback to character avatar if themed image fails to load
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = character.avatar
  }

  // Message is chosen in an effect, not during render, to keep render pure
  useEffect(() => {
    if (!open) return
    let text: string
    if (isDraw) text = pick(DRAW_MESSAGES)
    else if (isPvP) text = pick(PVP_WIN_MESSAGES[winner === 1 ? 'red' : 'black'])
    else if (winner === 1) text = pick(character.catchphrases.playerWins)
    else text = pick(character.catchphrases.characterWins)
    const timer = setTimeout(() => setMessage(text), 0)
    return () => clearTimeout(timer)
  }, [open, isDraw, winner, character, isPvP])

  const title = isDraw
    ? 'Draw'
    : isPvP
      ? winner === 1
        ? 'Red won'
        : 'Black won'
      : winner === 1
        ? `You beat ${character.name}`
        : `${character.name} won`

  const art = winner === 1 ? character.loseImage : winner === 2 ? character.winImage : character.playAgainImage

  const countLine = isPvP
    ? `Red ${redCount}, Black ${blackCount}`
    : `You ${redCount}, ${character.name} ${blackCount}`

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm" hideClose>
        <DialogHeader className="items-center text-center sm:text-center">
          {!isPvP && (
            <img
              src={art}
              alt={character.name}
              className="mb-2 max-h-44 w-auto object-contain"
              onError={handleImageError}
            />
          )}
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        <p className="text-center text-sm text-muted-foreground">Final count: {countLine}</p>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center sm:space-x-0">
          <Button onClick={onPlayAgain} className="h-11">
            Play again
          </Button>
          <Button onClick={onClose} variant="ghost" className="h-11">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const VictoryDialog = React.memo(VictoryDialogComponent)
