/**
 * Unit tests for useAchievements hook
 */

import { renderHook, act } from '@testing-library/react'
import { useAchievements } from '@/hooks/useAchievements'
import type { AchievementContext } from '@/hooks/useAchievements'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import type { AchievementId } from '@/types/achievements.types'

describe('useAchievements', () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {}

    Storage.prototype.getItem = jest.fn((key: string) => localStorageMock[key] || null)
    Storage.prototype.setItem = jest.fn((key: string, value: string) => {
      localStorageMock[key] = value
    })
    Storage.prototype.removeItem = jest.fn((key: string) => {
      delete localStorageMock[key]
    })

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('initialization', () => {
    it('initializes with default locked achievements when localStorage is empty', () => {
      const { result } = renderHook(() => useAchievements())

      expect(result.current.achievements).toBeDefined()
      expect(result.current.achievements.first_victory).toBeDefined()
      expect(result.current.achievements.first_victory.unlockedAt).toBeUndefined()
      expect(result.current.achievements.first_victory.name).toBe('First Victory')
      expect(result.current.recentlyUnlocked).toBeNull()
    })

    it('loads achievements from localStorage when available', () => {
      // First render to get the default state structure
      const { result: initialResult } = renderHook(() => useAchievements())
      const defaultState = initialResult.current.achievements

      // Now create a mock state with one unlocked achievement
      const mockState = {
        ...defaultState,
        first_victory: {
          ...defaultState.first_victory,
          unlockedAt: 1234567890,
        },
      }

      localStorageMock[STORAGE_KEYS.ACHIEVEMENTS] = JSON.stringify(mockState)

      const { result } = renderHook(() => useAchievements())

      expect(result.current.achievements.first_victory.unlockedAt).toBe(1234567890)
      expect(result.current.achievements.triple_jump.unlockedAt).toBeUndefined()
    })

    it('handles corrupted localStorage data gracefully', () => {
      localStorageMock[STORAGE_KEYS.ACHIEVEMENTS] = 'invalid json{'

      const { result } = renderHook(() => useAchievements())

      expect(result.current.achievements.first_victory.unlockedAt).toBeUndefined()
      expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACHIEVEMENTS)
    })

    it('handles invalid achievement state structure', () => {
      localStorageMock[STORAGE_KEYS.ACHIEVEMENTS] = JSON.stringify({ invalid: 'data' })

      const { result } = renderHook(() => useAchievements())

      expect(result.current.achievements.first_victory.unlockedAt).toBeUndefined()
      expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACHIEVEMENTS)
    })

    it('merges new achievements with existing localStorage data', () => {
      // First render to get the default state structure
      const { result: initialResult } = renderHook(() => useAchievements())
      const defaultState = initialResult.current.achievements

      // Create a valid state with all achievements, but with updated names to simulate old version
      const oldState = {
        ...defaultState,
        first_victory: {
          ...defaultState.first_victory,
          unlockedAt: 1234567890,
          name: 'Old Name', // Different name to show it gets updated
        },
      }

      localStorageMock[STORAGE_KEYS.ACHIEVEMENTS] = JSON.stringify(oldState)

      const { result } = renderHook(() => useAchievements())

      // Old unlocked timestamp preserved
      expect(result.current.achievements.first_victory.unlockedAt).toBe(1234567890)
      // But name gets merged from defaults (though in practice this won't happen,
      // the merge ensures new achievements added in updates are included)
      expect(result.current.achievements.streak_3).toBeDefined()
      expect(result.current.achievements.streak_3.unlockedAt).toBeUndefined()
    })
  })

  describe('unlockAchievement', () => {
    it('unlocks a single achievement', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.unlockAchievement('first_victory')
        expect(unlocked).toBe(true)
      })

      expect(result.current.achievements.first_victory.unlockedAt).toBeDefined()
      expect(result.current.achievements.first_victory.unlockedAt).toBeGreaterThan(0)
      expect(result.current.recentlyUnlocked).toBe('first_victory')
    })

    it('persists unlocked achievement to localStorage', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        result.current.unlockAchievement('first_victory')
      })

      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACHIEVEMENTS,
        expect.any(String)
      )

      const saved = JSON.parse(localStorageMock[STORAGE_KEYS.ACHIEVEMENTS])
      expect(saved.first_victory.unlockedAt).toBeDefined()
    })

    it('returns false when trying to unlock already unlocked achievement', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        result.current.unlockAchievement('first_victory')
      })

      const firstUnlockTime = result.current.achievements.first_victory.unlockedAt

      act(() => {
        const unlocked = result.current.unlockAchievement('first_victory')
        expect(unlocked).toBe(false)
      })

      expect(result.current.achievements.first_victory.unlockedAt).toBe(firstUnlockTime)
    })

    it('sets recentlyUnlocked when achievement is unlocked', () => {
      const { result } = renderHook(() => useAchievements())

      expect(result.current.recentlyUnlocked).toBeNull()

      act(() => {
        result.current.unlockAchievement('triple_jump')
      })

      expect(result.current.recentlyUnlocked).toBe('triple_jump')
    })
  })

  describe('checkAchievements - basic functionality', () => {
    const baseContext: AchievementContext = {
      winner: 1,
      playerIs: 1,
      difficulty: 'medium',
      mode: 'pvc',
      moveCount: 50,
      redCount: 6,
      blackCount: 6,
      maxJumpsInOneMove: 1,
      hadKingCaptured: false,
      playerGotKing: false,
      wasDownBy3OrMore: false,
      currentWinStreak: 1,
      totalGamesPlayed: 1,
      totalCapturesAllTime: 10,
    }

    it('returns empty array in PvP mode', () => {
      const { result } = renderHook(() => useAchievements())

      const pvpContext: AchievementContext = {
        ...baseContext,
        mode: 'pvp',
      }

      act(() => {
        const unlocked = result.current.checkAchievements(pvpContext)
        expect(unlocked).toEqual([])
      })

      expect(result.current.achievements.first_victory.unlockedAt).toBeUndefined()
    })

    it('unlocks multiple achievements at once', () => {
      const { result } = renderHook(() => useAchievements())

      const multiContext: AchievementContext = {
        ...baseContext,
        winner: 1,
        playerIs: 1,
        redCount: 12, // flawless
        moveCount: 15, // speed demon
        playerGotKing: true, // king_me
      }

      act(() => {
        const unlocked = result.current.checkAchievements(multiContext)
        expect(unlocked.length).toBeGreaterThan(1)
        expect(unlocked).toContain('first_victory')
        expect(unlocked).toContain('flawless_victory')
        expect(unlocked).toContain('speed_demon')
        expect(unlocked).toContain('king_me')
      })
    })

    it('does not re-unlock already unlocked achievements', () => {
      const { result } = renderHook(() => useAchievements())

      const winContext: AchievementContext = {
        ...baseContext,
        winner: 1,
        playerIs: 1,
      }

      // First unlock
      act(() => {
        const unlocked = result.current.checkAchievements(winContext)
        expect(unlocked).toContain('first_victory')
      })

      const firstUnlockTime = result.current.achievements.first_victory.unlockedAt

      // Try to unlock again
      act(() => {
        const unlocked = result.current.checkAchievements(winContext)
        expect(unlocked).not.toContain('first_victory')
        expect(unlocked).toEqual([])
      })

      expect(result.current.achievements.first_victory.unlockedAt).toBe(firstUnlockTime)
    })

    it('sets recentlyUnlocked to last achievement when multiple unlock', () => {
      const { result } = renderHook(() => useAchievements())

      const multiContext: AchievementContext = {
        ...baseContext,
        winner: 1,
        playerIs: 1,
        redCount: 12,
        moveCount: 15,
      }

      let unlockedIds: AchievementId[] = []

      act(() => {
        unlockedIds = result.current.checkAchievements(multiContext)
        expect(unlockedIds.length).toBeGreaterThan(0)
      })

      // Should set to the last unlocked achievement
      expect(result.current.recentlyUnlocked).toBe(unlockedIds[unlockedIds.length - 1])
    })
  })

  describe('checkAchievements - individual achievements', () => {
    const baseContext: AchievementContext = {
      winner: 1,
      playerIs: 1,
      difficulty: 'medium',
      mode: 'pvc',
      moveCount: 50,
      redCount: 6,
      blackCount: 6,
      maxJumpsInOneMove: 1,
      hadKingCaptured: false,
      playerGotKing: false,
      wasDownBy3OrMore: false,
      currentWinStreak: 1,
      totalGamesPlayed: 1,
      totalCapturesAllTime: 10,
    }

    it('unlocks first_victory when player wins', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
        })
        expect(unlocked).toContain('first_victory')
      })

      expect(result.current.achievements.first_victory.unlockedAt).toBeDefined()
    })

    it('does not unlock first_victory when player loses', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 2,
          playerIs: 1,
        })
        expect(unlocked).not.toContain('first_victory')
      })

      expect(result.current.achievements.first_victory.unlockedAt).toBeUndefined()
    })

    it('unlocks triple_jump with 3 jumps', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          maxJumpsInOneMove: 3,
        })
        expect(unlocked).toContain('triple_jump')
      })
    })

    it('unlocks triple_jump with more than 3 jumps', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          maxJumpsInOneMove: 5,
        })
        expect(unlocked).toContain('triple_jump')
      })
    })

    it('does not unlock triple_jump with less than 3 jumps', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          maxJumpsInOneMove: 2,
        })
        expect(unlocked).not.toContain('triple_jump')
      })
    })

    it('unlocks king_slayer when king is captured', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          hadKingCaptured: true,
        })
        expect(unlocked).toContain('king_slayer')
      })
    })

    it('unlocks flawless_victory when winning with all 12 pieces (player 1)', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
          redCount: 12,
          blackCount: 0,
        })
        expect(unlocked).toContain('flawless_victory')
      })
    })

    it('unlocks flawless_victory when winning with all 12 pieces (player 2)', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 2,
          playerIs: 2,
          redCount: 0,
          blackCount: 12,
        })
        expect(unlocked).toContain('flawless_victory')
      })
    })

    it('does not unlock flawless_victory when losing with all pieces', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 2,
          playerIs: 1,
          redCount: 12,
        })
        expect(unlocked).not.toContain('flawless_victory')
      })
    })

    it('does not unlock flawless_victory when winning with less than 12 pieces', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
          redCount: 11,
        })
        expect(unlocked).not.toContain('flawless_victory')
      })
    })

    it('unlocks speed_demon when winning in under 20 moves', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
          moveCount: 19,
        })
        expect(unlocked).toContain('speed_demon')
      })
    })

    it('does not unlock speed_demon when winning in 20 or more moves', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
          moveCount: 20,
        })
        expect(unlocked).not.toContain('speed_demon')
      })
    })

    it('does not unlock speed_demon when losing quickly', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 2,
          playerIs: 1,
          moveCount: 15,
        })
        expect(unlocked).not.toContain('speed_demon')
      })
    })

    it('unlocks comeback_kid when winning after being down 3+ pieces', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
          wasDownBy3OrMore: true,
        })
        expect(unlocked).toContain('comeback_kid')
      })
    })

    it('does not unlock comeback_kid when winning without being down', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
          wasDownBy3OrMore: false,
        })
        expect(unlocked).not.toContain('comeback_kid')
      })
    })

    it('does not unlock comeback_kid when losing after being down', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 2,
          playerIs: 1,
          wasDownBy3OrMore: true,
        })
        expect(unlocked).not.toContain('comeback_kid')
      })
    })

    it('unlocks streak_3 with 3-game win streak', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          currentWinStreak: 3,
        })
        expect(unlocked).toContain('streak_3')
      })
    })

    it('unlocks streak_3 with more than 3-game win streak', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          currentWinStreak: 5,
        })
        expect(unlocked).toContain('streak_3')
      })
    })

    it('unlocks streak_5 with 5-game win streak', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          currentWinStreak: 5,
        })
        expect(unlocked).toContain('streak_5')
      })
    })

    it('does not unlock streak_5 with less than 5 wins', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          currentWinStreak: 4,
        })
        expect(unlocked).not.toContain('streak_5')
      })
    })

    it('unlocks centurion with 100 total captures', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          totalCapturesAllTime: 100,
        })
        expect(unlocked).toContain('centurion')
      })
    })

    it('unlocks centurion with more than 100 captures', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          totalCapturesAllTime: 150,
        })
        expect(unlocked).toContain('centurion')
      })
    })

    it('does not unlock centurion with less than 100 captures', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          totalCapturesAllTime: 99,
        })
        expect(unlocked).not.toContain('centurion')
      })
    })

    it('unlocks board_master with 50 total games', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          totalGamesPlayed: 50,
        })
        expect(unlocked).toContain('board_master')
      })
    })

    it('does not unlock board_master with less than 50 games', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          totalGamesPlayed: 49,
        })
        expect(unlocked).not.toContain('board_master')
      })
    })

    it('unlocks beat_bella when beating easy difficulty', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
          difficulty: 'easy',
        })
        expect(unlocked).toContain('beat_bella')
      })
    })

    it('does not unlock beat_bella when losing on easy', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 2,
          playerIs: 1,
          difficulty: 'easy',
        })
        expect(unlocked).not.toContain('beat_bella')
      })
    })

    it('unlocks beat_coop when beating medium difficulty', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
          difficulty: 'medium',
        })
        expect(unlocked).toContain('beat_coop')
      })
    })

    it('unlocks beat_bentley when beating hard difficulty', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
          difficulty: 'hard',
        })
        expect(unlocked).toContain('beat_bentley')
      })
    })

    it('unlocks king_me when player gets a king', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          playerGotKing: true,
        })
        expect(unlocked).toContain('king_me')
      })
    })

    it('does not unlock king_me when player does not get a king', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          playerGotKing: false,
        })
        expect(unlocked).not.toContain('king_me')
      })
    })
  })

  describe('clearRecentlyUnlocked', () => {
    it('clears the recentlyUnlocked state', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        result.current.unlockAchievement('first_victory')
      })

      expect(result.current.recentlyUnlocked).toBe('first_victory')

      act(() => {
        result.current.clearRecentlyUnlocked()
      })

      expect(result.current.recentlyUnlocked).toBeNull()
    })
  })

  describe('resetAchievements', () => {
    it('resets all achievements to locked state', () => {
      const { result } = renderHook(() => useAchievements())

      // Unlock some achievements
      act(() => {
        const unlocked1 = result.current.unlockAchievement('first_victory')
        expect(unlocked1).toBe(true)
      })

      act(() => {
        const unlocked2 = result.current.unlockAchievement('triple_jump')
        expect(unlocked2).toBe(true)
      })

      expect(result.current.achievements.first_victory.unlockedAt).toBeDefined()
      expect(result.current.achievements.triple_jump.unlockedAt).toBeDefined()

      // Reset
      act(() => {
        result.current.resetAchievements()
      })

      expect(result.current.achievements.first_victory.unlockedAt).toBeUndefined()
      expect(result.current.achievements.triple_jump.unlockedAt).toBeUndefined()
      expect(result.current.recentlyUnlocked).toBeNull()
    })

    it('persists reset state to localStorage', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        result.current.unlockAchievement('first_victory')
      })

      act(() => {
        result.current.resetAchievements()
      })

      const saved = JSON.parse(localStorageMock[STORAGE_KEYS.ACHIEVEMENTS])
      expect(saved.first_victory.unlockedAt).toBeUndefined()
    })

    it('clears recentlyUnlocked when resetting', () => {
      const { result } = renderHook(() => useAchievements())

      act(() => {
        result.current.unlockAchievement('first_victory')
      })

      expect(result.current.recentlyUnlocked).toBe('first_victory')

      act(() => {
        result.current.resetAchievements()
      })

      expect(result.current.recentlyUnlocked).toBeNull()
    })
  })

  describe('complex scenarios', () => {
    const baseContext: AchievementContext = {
      winner: 1,
      playerIs: 1,
      difficulty: 'hard',
      mode: 'pvc',
      moveCount: 50,
      redCount: 6,
      blackCount: 6,
      maxJumpsInOneMove: 1,
      hadKingCaptured: false,
      playerGotKing: false,
      wasDownBy3OrMore: false,
      currentWinStreak: 1,
      totalGamesPlayed: 1,
      totalCapturesAllTime: 10,
    }

    it('unlocks multiple related achievements in one game', () => {
      const { result } = renderHook(() => useAchievements())

      const perfectGameContext: AchievementContext = {
        ...baseContext,
        winner: 1,
        playerIs: 1,
        difficulty: 'hard',
        redCount: 12, // flawless
        moveCount: 18, // speed demon
        playerGotKing: true, // king_me
        hadKingCaptured: true, // king_slayer
        maxJumpsInOneMove: 4, // triple jump
        currentWinStreak: 5, // streak_3 and streak_5
        totalCapturesAllTime: 100, // centurion
        totalGamesPlayed: 50, // board_master
      }

      let unlocked: AchievementId[] = []

      act(() => {
        unlocked = result.current.checkAchievements(perfectGameContext)

        expect(unlocked).toContain('first_victory')
        expect(unlocked).toContain('flawless_victory')
        expect(unlocked).toContain('speed_demon')
        expect(unlocked).toContain('king_me')
        expect(unlocked).toContain('king_slayer')
        expect(unlocked).toContain('triple_jump')
        expect(unlocked).toContain('beat_bentley')
        expect(unlocked).toContain('streak_3')
        expect(unlocked).toContain('streak_5')
        expect(unlocked).toContain('centurion')
        expect(unlocked).toContain('board_master')
      })

      expect(unlocked.length).toBe(11)
    })

    it('handles incremental achievement unlocking across multiple games', () => {
      const { result } = renderHook(() => useAchievements())

      // Game 1: First win (also unlocks beat_coop since we're on medium)
      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          winner: 1,
          playerIs: 1,
          difficulty: 'medium',
        })
        expect(unlocked).toContain('first_victory')
        expect(unlocked).toContain('beat_coop')
      })

      // Game 2: Triple jump
      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          maxJumpsInOneMove: 3,
          winner: null, // Draw, so no win achievements
        })
        expect(unlocked).toContain('triple_jump')
        expect(unlocked).not.toContain('first_victory') // Already unlocked
      })

      // Game 3: Win streak
      act(() => {
        const unlocked = result.current.checkAchievements({
          ...baseContext,
          currentWinStreak: 3,
          winner: null, // Check that streak alone can unlock
        })
        expect(unlocked).toContain('streak_3')
      })

      expect(result.current.achievements.first_victory.unlockedAt).toBeDefined()
      expect(result.current.achievements.triple_jump.unlockedAt).toBeDefined()
      expect(result.current.achievements.streak_3.unlockedAt).toBeDefined()
    })

    it('correctly handles player being player 2', () => {
      const { result } = renderHook(() => useAchievements())

      const player2Context: AchievementContext = {
        ...baseContext,
        winner: 2,
        playerIs: 2,
        redCount: 0,
        blackCount: 12, // Player 2 has all pieces
      }

      act(() => {
        const unlocked = result.current.checkAchievements(player2Context)
        expect(unlocked).toContain('first_victory')
        expect(unlocked).toContain('flawless_victory')
      })
    })

    it('does not unlock win-based achievements when there is no winner', () => {
      const { result } = renderHook(() => useAchievements())

      const drawContext: AchievementContext = {
        ...baseContext,
        winner: null,
        playerIs: 1,
        redCount: 12,
        moveCount: 15,
      }

      act(() => {
        const unlocked = result.current.checkAchievements(drawContext)
        expect(unlocked).not.toContain('first_victory')
        expect(unlocked).not.toContain('flawless_victory')
        expect(unlocked).not.toContain('speed_demon')
        expect(unlocked).not.toContain('comeback_kid')
      })
    })

    it('unlocks non-win-based achievements even without a winner', () => {
      const { result } = renderHook(() => useAchievements())

      const drawWithAchievementsContext: AchievementContext = {
        ...baseContext,
        winner: null,
        maxJumpsInOneMove: 3,
        hadKingCaptured: true,
        playerGotKing: true,
        totalCapturesAllTime: 100,
        totalGamesPlayed: 50,
      }

      act(() => {
        const unlocked = result.current.checkAchievements(drawWithAchievementsContext)
        expect(unlocked).toContain('triple_jump')
        expect(unlocked).toContain('king_slayer')
        expect(unlocked).toContain('king_me')
        expect(unlocked).toContain('centurion')
        expect(unlocked).toContain('board_master')
      })
    })
  })

  describe('localStorage edge cases', () => {
    it('handles localStorage being unavailable', () => {
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error('localStorage unavailable')
      })

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const { result } = renderHook(() => useAchievements())

      expect(result.current.achievements).toBeDefined()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('localStorage unavailable')
      )

      consoleWarnSpy.mockRestore()
    })

    it('handles localStorage.setItem throwing error', () => {
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('localStorage full')
      })

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const { result } = renderHook(() => useAchievements())

      act(() => {
        result.current.unlockAchievement('first_victory')
      })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('localStorage unavailable')
      )

      consoleWarnSpy.mockRestore()
    })

    it('handles malformed achievement data with negative unlockedAt', () => {
      const badState = {
        first_victory: {
          id: 'first_victory',
          name: 'First Victory',
          description: 'Win your first game',
          icon: '🏆',
          unlockedAt: -1, // Invalid negative timestamp
        },
      }

      localStorageMock[STORAGE_KEYS.ACHIEVEMENTS] = JSON.stringify(badState)

      const { result } = renderHook(() => useAchievements())

      expect(result.current.achievements.first_victory.unlockedAt).toBeUndefined()
      expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACHIEVEMENTS)
    })
  })
})
