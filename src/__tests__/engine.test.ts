// Engine tests: agreement with the rules module, tactics, draw rules, legality.

import {
  createEmptyBoard,
  createInitialBoard,
  getAllValidMoves,
  applyMove,
  hashBoard,
} from '@/lib/checkersRules'
import { engineMoveKeys, searchBestMove, validMoveKey, MATE } from '@/lib/engine'
import type { Board, Player } from '@/types/checkers.types'

/** Board from 8 rows of '.', r/R (red man/king, player 1), b/B (black man/king, player 2), joined by '/'. */
function decode(s: string): Board {
  const board = createEmptyBoard()
  s.split('/').forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === '.') return
      if ((r + c) % 2 === 0) throw new Error(`light square ${r},${c}`)
      board[r][c] = {
        player: ch.toLowerCase() === 'r' ? 1 : 2,
        type: ch === ch.toUpperCase() ? 'king' : 'regular',
      }
    })
  )
  return board
}

function lcg(seed: number) {
  let s = seed
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff
    return s / 0x80000000
  }
}

const other = (p: Player): Player => (p === 1 ? 2 : 1)

function randomPosition(rnd: () => number): Board {
  const b = createEmptyBoard()
  const n = 2 + Math.floor(rnd() * 18)
  for (let i = 0; i < n; i++) {
    const r = Math.floor(rnd() * 8)
    const c = Math.floor(rnd() * 8)
    if ((r + c) % 2 === 0 || b[r][c]) continue
    const player: Player = rnd() < 0.5 ? 1 : 2
    let king = rnd() < 0.35
    if ((player === 1 && r === 0) || (player === 2 && r === 7)) king = true
    b[r][c] = { player, type: king ? 'king' : 'regular' }
  }
  return b
}

function rulesKeys(b: Board, p: Player): string[] {
  return [...new Set(getAllValidMoves(b, p).map(validMoveKey))].sort()
}

describe('engine move generation agrees with checkersRules', () => {
  it('on positions from random games', () => {
    const rnd = lcg(42)
    let checked = 0
    for (let g = 0; g < 60; g++) {
      let b = createInitialBoard()
      let p: Player = 1
      for (let ply = 0; ply < 120; ply++) {
        const moves = getAllValidMoves(b, p)
        expect([...new Set(engineMoveKeys(b, p))].sort()).toEqual(rulesKeys(b, p))
        checked++
        if (moves.length === 0) break
        b = applyMove(b, moves[Math.floor(rnd() * moves.length)])
        p = other(p)
      }
    }
    expect(checked).toBeGreaterThan(3000)
  })

  it('on random king-heavy positions (multi-jumps, crowning mid-jump)', () => {
    const rnd = lcg(7)
    for (let i = 0; i < 3000; i++) {
      const b = randomPosition(rnd)
      for (const p of [1, 2] as Player[]) {
        expect([...new Set(engineMoveKeys(b, p))].sort()).toEqual(rulesKeys(b, p))
      }
    }
  })
})

describe('engine tactics', () => {
  it('wins in one: traps the last red man', () => {
    // Red man on a7-corner square (7,0); black kings on (5,0) and (5,2). Only (5,0)->(6,1) leaves red no move.
    const b = decode('......../......../......../......../......../B.B...../......../r.......')
    const r = searchBestMove(b, 2, { maxDepth: 6 })
    expect(r.move).toMatchObject({ from: { row: 5, col: 0 }, to: { row: 6, col: 1 } })
    expect(r.score).toBe(MATE - 1)
  })

  // Found and checked by an exhaustive search over checkersRules alone: each has a single fastest forced win.
  const wins: Array<{ b: string; p: Player; move: string }> = [
    { b: '.......b/......../......../R......./......../......../......../..r.....', p: 1, move: '29:25:0' },
    { b: '...b..../....r.../......../......../.....R../......R./......../....B...', p: 1, move: '18:22:0' },
    { b: '......../....B.../...B...R/......../.r....../......../......../........', p: 2, move: '6:10:0' },
    { b: '...B..../......../......../..B...../...b..../......../......../....r...', p: 2, move: '17:22:0' },
  ]
  it.each(wins)('finds the forced win in %#', ({ b, p, move }) => {
    const r = searchBestMove(decode(b), p, { maxDepth: 12 })
    expect(validMoveKey(r.move!)).toBe(move)
    expect(r.score).toBeGreaterThan(MATE - 20)
  })

  // Exactly one move is not lost within 6 plies (exhaustive search over checkersRules alone).
  const saves: Array<{ b: string; p: Player; move: string }> = [
    { b: '.....R../......../......../......../.....R../......../.....B../........', p: 2, move: '26:31:0' },
    { b: '......../B......./......../....B.../.....b../......../.....R../........', p: 1, move: '26:31:0' },
    { b: '......../......B./......../....r.../......../....R.../......../......R.', p: 2, move: '7:11:0' },
    { b: '......../B......./......../..R...../.....B../......../......../..B.....', p: 1, move: '13:9:0' },
    { b: '.R....../......../...R..../......../...R.B../......../......../........', p: 2, move: '18:23:0' },
  ]
  it.each(saves)('finds the only move that avoids a quick loss in %#', ({ b, p, move }) => {
    const r = searchBestMove(decode(b), p, { maxDepth: 12 })
    expect(validMoveKey(r.move!)).toBe(move)
  })

  it('plays a multi-jump as one move and finishes it', () => {
    // Red king on (7,2) must jump (6,3) and then (4,5).
    const b = decode('......../......../......../......../.....b../......../...b..../..R.....')
    const r = searchBestMove(b, 1, { maxDepth: 6 })
    expect(r.move!.jumps).toHaveLength(2)
  })

  it('converts two kings against one king in the double corner', () => {
    let b = decode('.B....../......../......../......../......../......../.......R/R.......')
    let p: Player = 1
    const history: string[] = []
    let counter = 0
    let winner: Player | null = null
    for (let ply = 0; ply < 80 && winner === null; ply++) {
      const r = searchBestMove(b, p, {
        maxDepth: 10,
        positionHistory: history,
        movesWithoutCaptureOrPromotion: counter,
      })
      if (!r.move) {
        winner = other(p)
        break
      }
      counter = r.move.jumps.length ? 0 : counter + 1
      b = applyMove(b, r.move)
      p = other(p)
      history.push(hashBoard(b, p))
      if (getAllValidMoves(b, p).length === 0) winner = other(p)
    }
    expect(winner).toBe(1)
  })
})

describe('engine draw rules', () => {
  // Red is a man down; with the 80-ply counter about to run out every red move ends in a draw.
  const behind = decode('......../......../...b.b../......../......../......../.....r../........')

  it('knows the 80-ply rule', () => {
    const fresh = searchBestMove(behind, 1, { maxDepth: 6 })
    expect(fresh.score).toBeLessThan(-50)
    const late = searchBestMove(behind, 1, { maxDepth: 6, movesWithoutCaptureOrPromotion: 79 })
    expect(late.score).toBe(0)
  })

  it('a losing side heads for a threefold repetition; a winning side avoids it', () => {
    // Black king (0,1) against red king (7,0) and red king (4,3); red is winning.
    const b = decode('.B....../......../......../......../...R..../......../......../R.......')
    const red = searchBestMove(b, 1, { maxDepth: 8 })
    expect(red.score).toBeGreaterThan(100)
    // Make red's best move a third repetition: the engine must play something else.
    const after = applyMove(b, red.move!)
    const h = hashBoard(after, 2)
    const filler = hashBoard(createInitialBoard(), 1)
    const again = searchBestMove(b, 1, {
      maxDepth: 8,
      positionHistory: [h, filler, h, hashBoard(b, 1)],
      movesWithoutCaptureOrPromotion: 4,
    })
    expect(validMoveKey(again.move!)).not.toBe(validMoveKey(red.move!))
    expect(again.score).toBeGreaterThan(0)

    // Black, the losing side, takes a move that repeats a position for the third time.
    const blackMoves = getAllValidMoves(b, 2)
    const target = applyMove(b, blackMoves[0])
    const th = hashBoard(target, 1)
    const black = searchBestMove(b, 2, {
      maxDepth: 6,
      positionHistory: [th, hashBoard(createInitialBoard(), 2), th, hashBoard(b, 2)],
      movesWithoutCaptureOrPromotion: 4,
    })
    expect(black.score).toBe(0)
    expect(validMoveKey(black.move!)).toBe(validMoveKey(blackMoves[0]))
  })
})

describe('engine legality', () => {
  it('never returns an illegal move or null while a legal move exists', () => {
    const rnd = lcg(99)
    for (let i = 0; i < 300; i++) {
      const b = randomPosition(rnd)
      const p: Player = rnd() < 0.5 ? 1 : 2
      const legal = getAllValidMoves(b, p)
      const r = searchBestMove(b, p, { maxDepth: 1 + (i % 5), maxNodes: 5000 })
      if (legal.length === 0) {
        expect(r.move).toBeNull()
      } else {
        expect(legal).toContainEqual(r.move)
      }
    }
  })

  it('completes depth 1 even with a tiny node budget', () => {
    const r = searchBestMove(createInitialBoard(), 1, { timeMs: 1, maxNodes: 1 })
    expect(r.depth).toBeGreaterThanOrEqual(1)
    expect(getAllValidMoves(createInitialBoard(), 1)).toContainEqual(r.move)
  })
})
