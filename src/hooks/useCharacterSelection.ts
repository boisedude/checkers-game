/**
 * Character Selection
 *
 * Exports: getInitialDifficulty(), useCharacterSelection(difficulty) -> { character, difficulty }
 * Maps difficulty to shared character system: easy=Bella, medium=Coop, hard=Bentley.
 * The game's difficulty is the single source of truth; the character is derived from it.
 * The arcade passes ?character=bella|coop|bentley, read once by getInitialDifficulty().
 */

import { useMemo } from 'react'
import { getCharacterById } from '@shared/characters'
import type { Character, CharacterId } from '@shared/characters'
import type { Difficulty } from '@/types/checkers.types'

const difficultyToCharacter: Record<Difficulty, CharacterId> = {
  easy: 'bella',
  medium: 'coop',
  hard: 'bentley',
}

const characterToDifficulty: Record<string, Difficulty> = {
  bella: 'easy',
  coop: 'medium',
  bentley: 'hard',
}

/** Difficulty requested by the ?character= URL parameter, defaulting to medium (Coop). */
export function getInitialDifficulty(search: string = window.location.search): Difficulty {
  const id = new URLSearchParams(search).get('character')?.toLowerCase()
  if (id && Object.prototype.hasOwnProperty.call(characterToDifficulty, id)) {
    return characterToDifficulty[id]
  }
  return 'medium'
}

export function useCharacterSelection(difficulty: Difficulty) {
  const character: Character = useMemo(
    () => getCharacterById(difficultyToCharacter[difficulty]),
    [difficulty]
  )
  return { character, difficulty }
}
