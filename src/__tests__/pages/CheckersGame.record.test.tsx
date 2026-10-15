import { render } from '@testing-library/react'
import { CheckersGame } from '@/pages/CheckersGame'
import { createInitialGameState } from '@/lib/checkersRules'
import type { GameState } from '@/types/checkers.types'

const mockPlayerBeat = jest.fn()
const mockBentleyBeat = jest.fn()
jest.mock('@shared/arcadeRecord', () => ({
  recordPlayerBeatBentley: () => mockPlayerBeat(),
  recordBentleyBeatPlayer: () => mockBentleyBeat(),
}))

let mockState: GameState
jest.mock('@/hooks/useCheckersGame', () => ({
  useCheckersGame: () => ({
    gameState: mockState,
    isAnimating: false,
    animatingPiece: null,
    capturedPiece: null,
    promotedPiece: null,
    intermediateBoard: null,
    handleSquareClick: jest.fn(),
    startNewGame: jest.fn(),
    startGame: jest.fn(),
    returnToSetup: jest.fn(),
    resumeGame: jest.fn(),
    changeDifficulty: jest.fn(),
    changeMode: jest.fn(),
    undoMove: jest.fn(),
    isHighlighted: () => false,
    isPieceSelected: () => false,
    canUndo: false,
    hasSavedGame: () => false,
  }),
}))
jest.mock('@/hooks/useGameAudio', () => ({
  useGameAudio: () => ({
    isMuted: false, toggleMute: jest.fn(), playDiscPlace: jest.fn(), playVictory: jest.fn(),
    playDefeat: jest.fn(), playDraw: jest.fn(), playCapture: jest.fn(), playMultiJump: jest.fn(),
    playKingPromotion: jest.fn(), playAchievementUnlock: jest.fn(),
  }),
}))
jest.mock('@/hooks/useBackgroundMusic', () => ({
  useBackgroundMusic: () => ({ isMusicMuted: true, toggleMusicMute: jest.fn() }),
}))

function state(over: Partial<GameState>): GameState {
  return { ...createInitialGameState('pvc', 'hard'), ...over }
}

function playThrough(playing: GameState, ended: GameState) {
  mockState = playing
  const view = render(<CheckersGame />)
  mockState = ended
  view.rerender(<CheckersGame />)
  view.rerender(<CheckersGame />)
}

describe('arcade Bentley record', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('checkers-tutorial-completed', 'true')
  })

  it('player win vs Bentley records recordPlayerBeatBentley once', () => {
    playThrough(state({}), state({ status: 'won', winner: 1, blackCount: 0 }))
    expect(mockPlayerBeat).toHaveBeenCalledTimes(1)
    expect(mockBentleyBeat).not.toHaveBeenCalled()
  })

  it('Bentley win records recordBentleyBeatPlayer once', () => {
    playThrough(state({}), state({ status: 'won', winner: 2, redCount: 0 }))
    expect(mockBentleyBeat).toHaveBeenCalledTimes(1)
    expect(mockPlayerBeat).not.toHaveBeenCalled()
  })

  it('does not record draws, other opponents, or PvP', () => {
    playThrough(state({}), state({ status: 'draw', winner: null }))
    playThrough(
      { ...state({}), difficulty: 'easy' },
      { ...state({ status: 'won', winner: 1 }), difficulty: 'easy' }
    )
    playThrough(
      { ...state({}), mode: 'pvp' },
      { ...state({ status: 'won', winner: 1 }), mode: 'pvp' }
    )
    expect(mockPlayerBeat).not.toHaveBeenCalled()
    expect(mockBentleyBeat).not.toHaveBeenCalled()
  })
})
