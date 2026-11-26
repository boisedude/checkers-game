import { renderHook, act } from '@testing-library/react'
import { useCheckersGame } from '@/hooks/useCheckersGame'
import { getAllValidMoves } from '@/lib/checkersRules'

describe('hint', () => {
  beforeEach(() => localStorage.clear())

  it('suggests a legal move on the player turn and clears when a new game starts', async () => {
    const { result } = renderHook(() => useCheckersGame('hard'))
    act(() => result.current.startGame('pvc', 'hard'))
    expect(result.current.canRequestHint).toBe(true)
    await act(async () => {
      await result.current.requestHint()
    })
    const hint = result.current.hintMove
    expect(hint).not.toBeNull()
    expect(getAllValidMoves(result.current.gameState.board, 1)).toContainEqual(hint)
    act(() => result.current.startNewGame())
    expect(result.current.hintMove).toBeNull()
  })

  it('is not offered in a two-player game', () => {
    const { result } = renderHook(() => useCheckersGame('hard'))
    act(() => result.current.startGame('pvp', 'hard'))
    expect(result.current.canRequestHint).toBe(false)
  })
})
