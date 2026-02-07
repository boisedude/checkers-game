// Unit tests for game serialization utilities

import {
  saveGame,
  loadSavedGame,
  clearSavedGame,
  hasSavedGame,
} from '@/lib/gameSerialization'
import type { GameState } from '@/types/checkers.types'
import { STORAGE_KEYS } from '@/lib/storageKeys'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string): string | null => {
      return store[key] || null
    }),
    setItem: jest.fn((key: string, value: string): void => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string): void => {
      delete store[key]
    }),
    clear: jest.fn((): void => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: jest.fn((index: number): string | null => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Helper to create a valid GameState for testing
function createValidGameState(): GameState {
  return {
    board: Array(8).fill(null).map(() => Array(8).fill(null)),
    currentPlayer: 1,
    status: 'playing',
    winner: null,
    mode: 'pvc',
    difficulty: 'medium',
    moveHistory: [],
    redCount: 12,
    blackCount: 12,
    redKings: 0,
    blackKings: 0,
    validMoves: [],
    mustJump: false,
    undoState: null,
    movesWithoutCaptureOrPromotion: 0,
    positionHistory: [],
    hadKingCaptured: false,
    wasDownBy3OrMore: false,
  }
}

describe('gameSerialization', () => {
  beforeEach(() => {
    // Clear localStorage and reset mocks before each test
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  describe('saveGame + loadSavedGame round-trip', () => {
    it('should save and load a game state correctly', () => {
      const state = createValidGameState()

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded).toEqual(state)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME,
        JSON.stringify(state)
      )
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should preserve all game state fields', () => {
      const state = createValidGameState()
      state.currentPlayer = 2
      state.status = 'won'
      state.winner = 1
      state.mode = 'pvp'
      state.difficulty = 'hard'
      state.redCount = 8
      state.blackCount = 5
      state.redKings = 2
      state.blackKings = 1
      state.mustJump = true
      state.movesWithoutCaptureOrPromotion = 15
      state.positionHistory = ['hash1', 'hash2', 'hash3']
      state.hadKingCaptured = true
      state.wasDownBy3OrMore = true

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded).toEqual(state)
    })

    it('should handle complex board state', () => {
      const state = createValidGameState()
      state.board[0][1] = { player: 2, type: 'regular' }
      state.board[7][0] = { player: 1, type: 'king' }

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded).toEqual(state)
      expect(loaded?.board[0][1]).toEqual({ player: 2, type: 'regular' })
      expect(loaded?.board[7][0]).toEqual({ player: 1, type: 'king' })
    })

    it('should handle move history', () => {
      const state = createValidGameState()
      state.moveHistory = [
        {
          from: { row: 5, col: 0 },
          to: { row: 4, col: 1 },
          jumps: [],
          player: 1,
          becameKing: false,
        },
        {
          from: { row: 2, col: 1 },
          to: { row: 3, col: 0 },
          jumps: [],
          player: 2,
          becameKing: false,
        },
      ]

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded?.moveHistory).toEqual(state.moveHistory)
    })

    it('should handle valid moves', () => {
      const state = createValidGameState()
      state.validMoves = [
        {
          from: { row: 5, col: 0 },
          to: { row: 4, col: 1 },
          jumps: [],
        },
        {
          from: { row: 5, col: 2 },
          to: { row: 4, col: 3 },
          jumps: [],
          score: 10,
        },
      ]

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded?.validMoves).toEqual(state.validMoves)
    })
  })

  describe('loadSavedGame with missing data', () => {
    it('should return null when no saved game exists', () => {
      const loaded = loadSavedGame()

      expect(loaded).toBeNull()
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should return null for empty string', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, '')

      const loaded = loadSavedGame()

      expect(loaded).toBeNull()
    })
  })

  describe('loadSavedGame with invalid/corrupt data', () => {
    it('should return null and clear data for invalid JSON', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, 'not valid json')

      const loaded = loadSavedGame()

      expect(loaded).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should return null and clear data for non-object JSON', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(42))

      const loaded = loadSavedGame()

      expect(loaded).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should return null and clear data for array JSON', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify([1, 2, 3]))

      const loaded = loadSavedGame()

      expect(loaded).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should return null and clear data for null JSON', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(null))

      const loaded = loadSavedGame()

      expect(loaded).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should handle localStorage errors gracefully', () => {
      // Mock getItem to throw an error
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage error')
      })

      const loaded = loadSavedGame()

      expect(loaded).toBeNull()
    })

    it('should handle removeItem errors when clearing corrupt data', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, 'invalid json')
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('localStorage error')
      })

      const loaded = loadSavedGame()

      expect(loaded).toBeNull()
    })
  })

  describe('clearSavedGame', () => {
    it('should remove the saved game from localStorage', () => {
      const state = createValidGameState()
      saveGame(state)

      expect(hasSavedGame()).toBe(true)

      clearSavedGame()

      expect(hasSavedGame()).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should not error when no saved game exists', () => {
      expect(() => clearSavedGame()).not.toThrow()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('localStorage error')
      })

      expect(() => clearSavedGame()).not.toThrow()
    })
  })

  describe('hasSavedGame', () => {
    it('should return true when valid saved game exists', () => {
      const state = createValidGameState()
      saveGame(state)

      expect(hasSavedGame()).toBe(true)
    })

    it('should return false when no saved game exists', () => {
      expect(hasSavedGame()).toBe(false)
    })

    it('should return false for invalid JSON', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, 'invalid json')

      expect(hasSavedGame()).toBe(false)
    })

    it('should return false for invalid game state', () => {
      const invalidState = { board: [] } // Missing required fields
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(invalidState))

      expect(hasSavedGame()).toBe(false)
    })

    it('should return false when localStorage throws error', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage error')
      })

      expect(hasSavedGame()).toBe(false)
    })
  })

  describe('validation: missing required fields', () => {
    it('should reject object missing board', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).board
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
      expect(hasSavedGame()).toBe(false)
    })

    it('should reject object missing currentPlayer', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).currentPlayer
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing status', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).status
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing mode', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).mode
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing difficulty', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).difficulty
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing moveHistory', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).moveHistory
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing redCount', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).redCount
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing blackCount', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).blackCount
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing redKings', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).redKings
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing blackKings', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).blackKings
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing validMoves', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).validMoves
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing mustJump', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).mustJump
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing hadKingCaptured', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).hadKingCaptured
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing wasDownBy3OrMore', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).wasDownBy3OrMore
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing movesWithoutCaptureOrPromotion', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).movesWithoutCaptureOrPromotion
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject object missing positionHistory', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).positionHistory
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })
  })

  describe('validation: wrong field types', () => {
    it('should reject non-array board', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).board = 'not an array'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject invalid currentPlayer value', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).currentPlayer = 3
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-string status', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).status = 123
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-string mode', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).mode = { value: 'pvc' }
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-string difficulty', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).difficulty = ['hard']
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-array moveHistory', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).moveHistory = {}
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-number redCount', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).redCount = '12'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-number blackCount', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).blackCount = null
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-number redKings', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).redKings = true
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-number blackKings', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).blackKings = undefined
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-array validMoves', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).validMoves = null
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-boolean mustJump', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).mustJump = 'false'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-number movesWithoutCaptureOrPromotion', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).movesWithoutCaptureOrPromotion = '0'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-array positionHistory', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).positionHistory = 'hash1,hash2'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-boolean hadKingCaptured', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).hadKingCaptured = 1
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-boolean wasDownBy3OrMore', () => {
      const state = createValidGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).wasDownBy3OrMore = 0
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })
  })

  describe('saveGame error handling', () => {
    it('should handle localStorage.setItem errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage error')
      })

      const state = createValidGameState()

      expect(() => saveGame(state)).not.toThrow()
    })
  })
})
