/**
 * Achievements Hook
 *
 * Exports: useAchievements() -> { achievements, checkAchievements, unlockAchievement,
 * recentlyUnlocked, clearRecentlyUnlocked, resetAchievements }
 * Also exports: AchievementContext interface.
 *
 * 14 achievements, only checked in PvC mode at game end via checkAchievements().
 * State persisted in localStorage. Merges with defaults on load to handle new achievements.
 * recentlyUnlocked drives the toast notification display.
 */

import { useState, useCallback } from 'react'
import type {
  AchievementId,
  AchievementState,
  Achievement,
} from '@/types/achievements.types'
import { ACHIEVEMENT_DEFINITIONS } from '@/types/achievements.types'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import {
  INITIAL_PIECE_COUNT,
  SPEED_DEMON_MOVE_LIMIT,
  CENTURION_CAPTURE_COUNT,
  BOARD_MASTER_GAME_COUNT,
} from '@/lib/gameConstants'

/** Context for achievement evaluation. Passed to checkAchievements() at game end. */
export interface AchievementContext {
  winner: 1 | 2 | null
  playerIs: 1 | 2 // which player the human is (always 1 in PvC)
  difficulty: 'easy' | 'medium' | 'hard'
  mode: 'pvc' | 'pvp'
  moveCount: number
  redCount: number
  blackCount: number
  maxJumpsInOneMove: number // largest single-move capture chain
  hadKingCaptured: boolean // did any king get captured this game
  playerGotKing: boolean // did the player get at least one king
  wasDownBy3OrMore: boolean // was player ever down 3+ pieces
  currentWinStreak: number
  totalGamesPlayed: number
  totalCapturesAllTime: number
}

const ALL_ACHIEVEMENT_IDS: AchievementId[] = Object.keys(
  ACHIEVEMENT_DEFINITIONS
) as AchievementId[]

/** Creates default state with all achievements locked. */
function createDefaultAchievementState(): AchievementState {
  const state = {} as AchievementState
  for (const id of ALL_ACHIEVEMENT_IDS) {
    const def = ACHIEVEMENT_DEFINITIONS[id]
    state[id] = {
      id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      unlockedAt: undefined,
    }
  }
  return state
}

/** Type guard for AchievementState from localStorage. */
function isValidAchievementState(data: unknown): data is AchievementState {
  if (!data || typeof data !== 'object') {
    return false
  }

  const record = data as Record<string, unknown>

  // Check that every known achievement ID exists and is valid
  for (const id of ALL_ACHIEVEMENT_IDS) {
    const entry = record[id]
    if (!entry || typeof entry !== 'object') {
      return false
    }

    const achievement = entry as Partial<Achievement>

    if (
      typeof achievement.id !== 'string' ||
      typeof achievement.name !== 'string' ||
      typeof achievement.description !== 'string' ||
      typeof achievement.icon !== 'string'
    ) {
      return false
    }

    // unlockedAt is optional, but if present must be a non-negative number
    if (
      achievement.unlockedAt !== undefined &&
      (typeof achievement.unlockedAt !== 'number' || achievement.unlockedAt < 0)
    ) {
      return false
    }
  }

  return true
}

/** Loads from localStorage, merges with defaults (picks up new achievements). */
function getInitialAchievementState(): AchievementState {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS)
    if (stored) {
      const data = JSON.parse(stored)

      if (isValidAchievementState(data)) {
        // Merge with defaults to pick up any new achievements added in updates
        const defaults = createDefaultAchievementState()
        return { ...defaults, ...data }
      } else {
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS)
      }
    }
  } catch {
    console.warn('checkers: localStorage unavailable for achievements')
    try {
      localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS)
    } catch {
      console.warn('checkers: localStorage unavailable')
    }
  }

  return createDefaultAchievementState()
}

/** Persists achievement state to localStorage. */
function saveAchievementState(state: AchievementState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(state))
  } catch {
    console.warn('checkers: localStorage unavailable for achievements')
  }
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<AchievementState>(
    getInitialAchievementState
  )
  const [recentlyUnlocked, setRecentlyUnlocked] =
    useState<AchievementId | null>(null)

  /**
   * Unlock a single achievement by ID.
   * Returns true if the achievement was newly unlocked, false if already unlocked.
   */
  const unlockAchievement = useCallback(
    (id: AchievementId): boolean => {
      if (achievements[id].unlockedAt !== undefined) {
        return false
      }

      const now = Date.now()
      const updated = {
        ...achievements,
        [id]: {
          ...achievements[id],
          unlockedAt: now,
        },
      }

      setAchievements(updated)
      saveAchievementState(updated)
      setRecentlyUnlocked(id)
      return true
    },
    [achievements]
  )

  /**
   * Check all achievement conditions against the given context.
   * Only checks in PvC mode. Returns array of newly unlocked achievement IDs.
   */
  const checkAchievements = useCallback(
    (context: AchievementContext): AchievementId[] => {
      // Only check achievements in PvC mode
      if (context.mode !== 'pvc') {
        return []
      }

      const newlyUnlocked: AchievementId[] = []
      const now = Date.now()
      let current = { ...achievements }

      const tryUnlock = (id: AchievementId) => {
        if (current[id].unlockedAt === undefined) {
          current = {
            ...current,
            [id]: { ...current[id], unlockedAt: now },
          }
          newlyUnlocked.push(id)
        }
      }

      const playerWon = context.winner === context.playerIs

      // first_victory: Win your first game
      if (playerWon) {
        tryUnlock('first_victory')
      }

      // triple_jump: Capture 3+ pieces in a single move
      if (context.maxJumpsInOneMove >= 3) {
        tryUnlock('triple_jump')
      }

      // flawless_victory: Win without losing any pieces (player is Red = player 1)
      if (playerWon) {
        const playerPieceCount =
          context.playerIs === 1 ? context.redCount : context.blackCount
        if (playerPieceCount === INITIAL_PIECE_COUNT) {
          tryUnlock('flawless_victory')
        }
      }

      // king_me: Get your first king
      if (context.playerGotKing) {
        tryUnlock('king_me')
      }

      // king_slayer: Capture an opponent's king
      if (context.hadKingCaptured) {
        tryUnlock('king_slayer')
      }

      // comeback_kid: Win after being down 3+ pieces
      if (playerWon && context.wasDownBy3OrMore) {
        tryUnlock('comeback_kid')
      }

      // speed_demon: Win in under 20 moves
      if (playerWon && context.moveCount < SPEED_DEMON_MOVE_LIMIT) {
        tryUnlock('speed_demon')
      }

      // beat_bella: Beat Bella (easy)
      if (playerWon && context.difficulty === 'easy') {
        tryUnlock('beat_bella')
      }

      // beat_coop: Beat Coop (medium)
      if (playerWon && context.difficulty === 'medium') {
        tryUnlock('beat_coop')
      }

      // beat_bentley: Beat Bentley (hard)
      if (playerWon && context.difficulty === 'hard') {
        tryUnlock('beat_bentley')
      }

      // streak_3: Win 3 games in a row
      if (context.currentWinStreak >= 3) {
        tryUnlock('streak_3')
      }

      // streak_5: Win 5 games in a row
      if (context.currentWinStreak >= 5) {
        tryUnlock('streak_5')
      }

      // centurion: Capture 100 total pieces
      if (context.totalCapturesAllTime >= CENTURION_CAPTURE_COUNT) {
        tryUnlock('centurion')
      }

      // board_master: Play 50 total games
      if (context.totalGamesPlayed >= BOARD_MASTER_GAME_COUNT) {
        tryUnlock('board_master')
      }

      if (newlyUnlocked.length > 0) {
        setAchievements(current)
        saveAchievementState(current)
        // Show the most recently unlocked one as notification
        setRecentlyUnlocked(newlyUnlocked[newlyUnlocked.length - 1])
      }

      return newlyUnlocked
    },
    [achievements]
  )

  const clearRecentlyUnlocked = useCallback(() => {
    setRecentlyUnlocked(null)
  }, [])

  const resetAchievements = useCallback(() => {
    const defaults = createDefaultAchievementState()
    setAchievements(defaults)
    saveAchievementState(defaults)
    setRecentlyUnlocked(null)
  }, [])

  return {
    achievements,
    unlockAchievement,
    checkAchievements,
    recentlyUnlocked,
    clearRecentlyUnlocked,
    resetAchievements,
  }
}
