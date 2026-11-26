/**
 * Checkers AI Strategies
 *
 * Exports: getAIMove(board, player, difficulty, context?) -> ValidMove | null.
 * - Easy (Bella): 2-ply minimax on material, and a random move 30% of the time.
 * - Medium (Coop): the engine at a fixed 4 plies (plus forced captures), choosing
 *   at random among moves within a quarter of a man of the best.
 * - Hard (Bentley): the engine with a 700 ms budget (see engine.ts).
 */

import type { Board, Player, ValidMove, Difficulty } from '@/types/checkers.types'
import { getAllValidMoves, applyMove, checkGameOver, countPieces } from './checkersRules'
import { searchBestMove } from './engine'

/** Bentley's thinking time per move in the worker (ms). */
export const BENTLEY_TIME_MS = 700
/** Time for a hint (ms). */
export const HINT_TIME_MS = 400
/** Budget when the search has to run on the main thread (no worker). */
export const SYNC_TIME_MS = 150
/** Coop searches a fixed number of plies (plus captures) and picks among near-equal moves. */
export const COOP_DEPTH = 4
const COOP_MARGIN = 25
/** In his first few moves Bentley may pick any move proven within this margin of the best. */
const BENTLEY_OPENING_MARGIN = 6
const BENTLEY_OPENING_PLIES = 10

/** Game context the engine needs to respect the draw rules. All fields are optional. */
export interface AIContext {
  positionHistory?: string[]
  movesWithoutCaptureOrPromotion?: number
  /** Plies played so far (opening variety). */
  plyCount?: number
  /** Overrides the time budget (hint, synchronous fallback). */
  timeMs?: number
}

// ---------------------------------------------------------------------------
// Bella: shallow material minimax with frequent random moves
// ---------------------------------------------------------------------------

const EASY_DEPTH = 2
const EASY_RANDOMNESS = 0.3
const EASY_PIECE = 100
const EASY_KING = 150
const WIN = 10000
const LOSS = -10000

function evaluateMaterial(board: Board, player: Player): number {
  const counts = countPieces(board)
  const myPieces = player === 1 ? counts.redCount : counts.blackCount
  const oppPieces = player === 1 ? counts.blackCount : counts.redCount
  const myKings = player === 1 ? counts.redKings : counts.blackKings
  const oppKings = player === 1 ? counts.blackKings : counts.redKings
  return (myPieces - oppPieces) * EASY_PIECE + (myKings - oppKings) * EASY_KING
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  player: Player
): { score: number; move: ValidMove | null } {
  const gameOver = checkGameOver(board, maximizingPlayer ? player : player === 1 ? 2 : 1)

  if (depth === 0 || gameOver.isOver) {
    if (gameOver.isOver) {
      if (gameOver.winner === player) return { score: WIN + depth, move: null }
      if (gameOver.winner !== null) return { score: LOSS - depth, move: null }
    }
    return { score: evaluateMaterial(board, player), move: null }
  }

  const currentPlayer = maximizingPlayer ? player : player === 1 ? 2 : 1
  const validMoves = getAllValidMoves(board, currentPlayer)
  if (validMoves.length === 0) {
    return { score: maximizingPlayer ? LOSS - depth : WIN + depth, move: null }
  }

  let bestMove: ValidMove | null = null
  if (maximizingPlayer) {
    let maxScore = -Infinity
    for (const move of validMoves) {
      const { score } = minimax(applyMove(board, move), depth - 1, alpha, beta, false, player)
      if (score > maxScore) {
        maxScore = score
        bestMove = move
      }
      alpha = Math.max(alpha, score)
      if (beta <= alpha) break
    }
    return { score: maxScore, move: bestMove }
  }
  let minScore = Infinity
  for (const move of validMoves) {
    const { score } = minimax(applyMove(board, move), depth - 1, alpha, beta, true, player)
    if (score < minScore) {
      minScore = score
      bestMove = move
    }
    beta = Math.min(beta, score)
    if (beta <= alpha) break
  }
  return { score: minScore, move: bestMove }
}

function bellaMove(board: Board, player: Player, validMoves: ValidMove[]): ValidMove {
  if (Math.random() < EASY_RANDOMNESS) {
    return validMoves[Math.floor(Math.random() * validMoves.length)]
  }
  const { move } = minimax(board, EASY_DEPTH, -Infinity, Infinity, true, player)
  return move || validMoves[Math.floor(Math.random() * validMoves.length)]
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** Returns the move for the given player and difficulty, or null when there is none. */
export function getAIMove(
  board: Board,
  player: Player,
  difficulty: Difficulty,
  context: AIContext = {}
): ValidMove | null {
  const validMoves = getAllValidMoves(board, player)
  if (validMoves.length === 0) return null
  if (validMoves.length === 1) return validMoves[0]

  if (difficulty === 'easy') return bellaMove(board, player, validMoves)

  const rules = {
    positionHistory: context.positionHistory,
    movesWithoutCaptureOrPromotion: context.movesWithoutCaptureOrPromotion,
  }
  const result =
    difficulty === 'medium'
      ? searchBestMove(board, player, {
          ...rules,
          maxDepth: COOP_DEPTH,
          exactRoot: true,
          randomMargin: COOP_MARGIN,
        })
      : searchBestMove(board, player, {
          ...rules,
          timeMs: context.timeMs ?? BENTLEY_TIME_MS,
          varietyMargin: (context.plyCount ?? 99) < BENTLEY_OPENING_PLIES ? BENTLEY_OPENING_MARGIN : 0,
        })
  return result.move ?? validMoves[0]
}
