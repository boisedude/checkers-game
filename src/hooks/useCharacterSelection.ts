/**
 * Character Selection Hook
 * Maps difficulty levels to characters and manages character state
 */

import { useState, useCallback } from 'react'
import { getCharacterById } from '../../../shared/characters'
import type { Character, CharacterId } from '../../../shared/characters'
import type { Difficulty } from '@/types/checkers.types'

// Map Othello difficulty to character IDs
const difficultyToCharacter: Record<Difficulty, CharacterId> = {
  easy: 'bella',
  medium: 'coop',
  hard: 'bentley',
}

export function useCharacterSelection(initialDifficulty: Difficulty = 'medium') {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty)
  const [character, setCharacter] = useState<Character>(() =>
    getCharacterById(difficultyToCharacter[initialDifficulty])
  )

  const changeCharacter = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
    const characterId = difficultyToCharacter[newDifficulty]
    setCharacter(getCharacterById(characterId))
  }, [])

  const getCharacterForDifficulty = useCallback((diff: Difficulty): Character => {
    const characterId = difficultyToCharacter[diff]
    return getCharacterById(characterId)
  }, [])

  return {
    character,
    difficulty,
    changeCharacter,
    getCharacterForDifficulty,
  }
}
