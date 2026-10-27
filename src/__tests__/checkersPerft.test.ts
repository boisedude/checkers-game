import { createInitialBoard, getAllValidMoves, applyMove } from '@/lib/checkersRules'
import type { Board, Player } from '@/types/checkers.types'

function perft(b: Board, p: Player, d: number): number {
  const ms = getAllValidMoves(b, p)
  if (d === 1) return ms.length
  let n = 0
  for (const m of ms) n += perft(applyMove(b, m), (p === 1 ? 2 : 1) as Player, d - 1)
  return n
}

// Known American checkers perft numbers from the starting position.
test('start position perft', () => {
  const b = createInitialBoard()
  expect([1, 2, 3, 4, 5, 6, 7, 8].map(d => perft(b, 1, d))).toEqual([7, 49, 302, 1469, 7361, 36768, 179740, 845931])
})
