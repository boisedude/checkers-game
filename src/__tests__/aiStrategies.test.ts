// Unit tests for the three opponents' entry point

import { getAIMove } from '@/lib/aiStrategies'
import { createInitialBoard, createEmptyBoard, getAllValidMoves, applyMove } from '@/lib/checkersRules'
import type { Board, Difficulty, Player } from '@/types/checkers.types'

function lcg(seed: number) {
  let s = seed
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff
    return s / 0x80000000
  }
}

/** Positions reached by random play from the start. */
function randomGamePositions(count: number, seed: number): Array<{ board: Board; player: Player }> {
  const rnd = lcg(seed)
  const out: Array<{ board: Board; player: Player }> = []
  while (out.length < count) {
    let board = createInitialBoard()
    let player: Player = 1
    const plies = Math.floor(rnd() * 50)
    for (let i = 0; i < plies; i++) {
      const moves = getAllValidMoves(board, player)
      if (moves.length === 0) break
      board = applyMove(board, moves[Math.floor(rnd() * moves.length)])
      player = player === 1 ? 2 : 1
    }
    if (getAllValidMoves(board, player).length > 0) out.push({ board, player })
  }
  return out
}

describe('getAIMove', () => {
  it('returns null when there is no move', () => {
    const board = createEmptyBoard()
    board[7][6] = { player: 2, type: 'regular' }
    for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
      expect(getAIMove(board, 2, d)).toBeNull()
    }
  })

  it.each(['easy', 'medium'] as Difficulty[])('%s returns legal moves on random positions', difficulty => {
    for (const { board, player } of randomGamePositions(25, difficulty === 'easy' ? 1 : 2)) {
      const move = getAIMove(board, player, difficulty)
      expect(getAllValidMoves(board, player)).toContainEqual(move)
    }
  })

  it('hard returns legal moves within a small budget', () => {
    for (const { board, player } of randomGamePositions(8, 3)) {
      const move = getAIMove(board, player, 'hard', { timeMs: 30 })
      expect(getAllValidMoves(board, player)).toContainEqual(move)
    }
  })

  it('works for player 1 (hints)', () => {
    const board = createInitialBoard()
    expect(getAllValidMoves(board, 1)).toContainEqual(getAIMove(board, 1, 'hard', { timeMs: 30 }))
  })

  it('Coop takes a free man instead of leaving it', () => {
    // Black man (2,3) can capture red (3,4) landing (4,5); captures are forced anyway,
    // so set up a choice: a quiet move that wins a man next turn versus one that loses one.
    const board = createEmptyBoard()
    board[2][1] = { player: 2, type: 'regular' }
    board[2][5] = { player: 2, type: 'regular' }
    board[4][3] = { player: 1, type: 'regular' }
    board[6][7] = { player: 1, type: 'regular' }
    const move = getAIMove(board, 2, 'medium')
    expect(getAllValidMoves(board, 2)).toContainEqual(move)
    const after = applyMove(board, move!)
    // Whatever Coop plays, red must not get a free capture out of it.
    const redJumps = getAllValidMoves(after, 1).filter(m => m.jumps.length > 0)
    expect(redJumps).toHaveLength(0)
  })

  it('Bella is still sometimes random', () => {
    const board = createInitialBoard()
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const m = getAIMove(board, 2, 'easy')!
      seen.add(`${m.from.row}${m.from.col}${m.to.row}${m.to.col}`)
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})
