/**
 * Welcome Screen Component
 *
 * Setup screen on the table. One player mode shows three outlined opponent cards;
 * two player mode shows a short note. Supports resuming saved games.
 */

import React from 'react'
import { Button } from './ui/button'
import type { Difficulty, GameMode } from '@/types/checkers.types'
import { getAllCharacters } from '@shared/characters'

interface WelcomeScreenProps {
  mode: GameMode
  difficulty: Difficulty
  onModeChange: (mode: GameMode) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onStartGame: () => void
  hasSavedGame?: boolean
  onResumeGame?: () => void
}

const characters = getAllCharacters()

const LEVEL_LABELS: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export const WelcomeScreen = React.memo(function WelcomeScreen({
  mode,
  difficulty,
  onModeChange,
  onDifficultyChange,
  onStartGame,
  hasSavedGame: hasSaved = false,
  onResumeGame,
}: WelcomeScreenProps) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 pt-2 sm:pt-6">
      {/* Mode */}
      <div
        className="flex w-full max-w-xs rounded-md border bg-card p-1"
        role="group"
        aria-label="Game mode"
      >
        {(
          [
            ['pvc', 'One player'],
            ['pvp', 'Two players'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`min-h-11 flex-1 rounded-sm px-3 text-sm font-semibold transition-colors ${
              mode === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onModeChange(value)}
            aria-pressed={mode === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Opponent cards */}
      {mode === 'pvc' && (
        <div className="grid w-full gap-3" role="group" aria-label="Opponent">
          {characters.map((char) => {
            const isSelected = char.difficulty === difficulty
            return (
              <button
                key={char.id}
                type="button"
                className={`flex min-h-16 items-center gap-4 rounded-md border bg-card p-3 text-left transition-colors hover:bg-secondary ${
                  isSelected ? 'border-primary bg-secondary' : 'border-border'
                }`}
                onClick={() => onDifficultyChange(char.difficulty as Difficulty)}
                aria-pressed={isSelected}
              >
                <img
                  src={char.avatar}
                  alt={`${char.name} avatar`}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                  style={{ boxShadow: `0 0 0 2px var(--arcade-${char.id})` }}
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{char.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {LEVEL_LABELS[char.difficulty] ?? char.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{char.playingStyle}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Two player note */}
      {mode === 'pvp' && (
        <p className="w-full rounded-md border bg-card p-4 text-center text-sm text-muted-foreground">
          Play against a friend on the same device. Red goes first.
        </p>
      )}

      {/* Start / Resume */}
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={onStartGame} className="h-11 w-full">
          Start game
        </Button>
        {hasSaved && onResumeGame && (
          <Button onClick={onResumeGame} variant="outline" className="h-11 w-full">
            Resume saved game
          </Button>
        )}
      </div>
    </div>
  )
})
