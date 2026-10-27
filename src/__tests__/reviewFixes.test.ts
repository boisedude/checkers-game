import { renderHook, act } from '@testing-library/react'
import { useCheckersGame } from '@/hooks/useCheckersGame'

type Hook = { current: ReturnType<typeof useCheckersGame> }

async function playerMove(result: Hook, a: [number, number], b: [number, number], wait = 2000) {
  await act(async () => { await result.current.handleSquareClick(a[0], a[1]) })
  await act(async () => {
    const p = result.current.handleSquareClick(b[0], b[1])
    await jest.advanceTimersByTimeAsync(wait)
    await p
  })
}

describe('hook: undo, AI scheduling, opponent changes', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    localStorage.clear()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('undo drops the undone positions from the repetition history and restores the draw counter', async () => {
    const { result } = renderHook(() => useCheckersGame('easy'))
    act(() => result.current.startGame('pvc', 'easy'))
    await playerMove(result, [5, 0], [4, 1])
    await act(async () => { await jest.advanceTimersByTimeAsync(4000) })
    expect(result.current.gameState.moveHistory).toHaveLength(2)
    expect(result.current.gameState.positionHistory).toHaveLength(2)
    act(() => result.current.undoMove())
    expect(result.current.gameState.moveHistory).toHaveLength(0)
    expect(result.current.gameState.positionHistory).toHaveLength(0)
    expect(result.current.gameState.movesWithoutCaptureOrPromotion).toBe(0)
  })

  it('the AI still moves when game state is touched while it is about to move', async () => {
    const { result } = renderHook(() => useCheckersGame('easy'))
    act(() => result.current.startGame('pvc', 'easy'))
    await playerMove(result, [5, 0], [4, 1], 400)
    // AI is waiting out its pre-move delay; the difficulty value is re-applied
    act(() => result.current.changeDifficulty('medium'))
    act(() => result.current.changeDifficulty('easy'))
    await act(async () => { await jest.advanceTimersByTimeAsync(5000) })
    expect(result.current.gameState.currentPlayer).toBe(1)
    expect(result.current.gameState.moveHistory).toHaveLength(2)
  })

  it('opponent cannot be changed once a game has moves', async () => {
    const { result } = renderHook(() => useCheckersGame('hard'))
    act(() => result.current.startGame('pvc', 'hard'))
    await playerMove(result, [5, 0], [4, 1])
    act(() => result.current.changeDifficulty('easy'))
    expect(result.current.gameState.difficulty).toBe('hard')
  })
})
