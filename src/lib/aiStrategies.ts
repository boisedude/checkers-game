/**
 * Checkers AI Strategies
 *
 * Exports: getAIMove(board, player, difficulty) -> ValidMove | null.
 * Uses minimax with alpha-beta pruning. Each difficulty has different:
 * - Search depth (2/4/6), evaluation weights, and randomness factor.
 * Easy (Bella) plays randomly 30% of the time. Hard (Bentley) never does.
 */

import type { Board, Player, ValidMove, Difficulty } from '@/types/checkers.types'
import {
  getAllValidMoves,
  applyMove,
  checkGameOver,
  countPieces,
} from './checkersRules'

// AI search depth by difficulty level
const AI_DEPTH = {
  easy: 2,    // Bella: shallow search keeps her fast and beatable
  medium: 4,  // Coop: deep enough for decent tactics, still quick to compute
  hard: 6,    // Bentley: deep search for near-optimal play within performance budget
} as const

// Scoring constants for game evaluation
const SCORE = {
  WIN: 10000,
  LOSS: -10000,
} as const

/** Board evaluation weights per difficulty. Higher values = stronger positional play. */
const EVAL_WEIGHTS = {
  // Easy (Bella): low king bonus and minimal positional awareness make her exploitable
  easy: {
    piece: 100,       // Base material value; same across all levels
    king: 150,        // Only 1.5x a regular piece -- undervalues promotion
    backRow: 10,      // Slight awareness of back-row defense
    center: 5,        // Barely considers center control
    mobility: 1,      // Nearly ignores move availability
    randomness: 0.3,  // 30% chance of a random move to create openings for the player
  },
  // Medium (Coop): balanced weights reward solid positional play without being ruthless
  medium: {
    piece: 100,       // Base material value
    king: 180,        // Kings valued ~2x a piece -- encourages promotion
    backRow: 15,      // Moderate back-row protection to block easy kings
    center: 10,       // Rewards controlling the center of the board
    mobility: 2,      // Values having more move options than the opponent
    randomness: 0.05, // 5% random moves add slight unpredictability
  },
  // Hard (Bentley): maximized positional weights for ruthless, optimal play
  hard: {
    piece: 100,       // Base material value
    king: 200,        // Kings worth 2x a piece -- strongly pursues promotion
    backRow: 20,      // Prioritizes back-row defense to deny opponent kings
    center: 15,       // Aggressively fights for central board dominance
    mobility: 3,      // Heavily penalizes positions with fewer available moves
    randomness: 0,    // No randomness -- always plays the best evaluated move
  },
}

/** Center 4x4 region -- controlling these squares gives positional advantage. */
const CENTER_SQUARES = new Set([
  '2,2', '2,3', '2,4', '2,5',
  '3,2', '3,3', '3,4', '3,5',
  '4,2', '4,3', '4,4', '4,5',
  '5,2', '5,3', '5,4', '5,5',
])

/** Evaluates board position. Positive = good for player. Considers material, position, mobility. */
function evaluateBoard(
  board: Board,
  player: Player,
  difficulty: Difficulty
): number {
  const weights = EVAL_WEIGHTS[difficulty]
  const counts = countPieces(board)
  let score = 0

  // Material count
  const myPieces = player === 1 ? counts.redCount : counts.blackCount
  const oppPieces = player === 1 ? counts.blackCount : counts.redCount
  const myKings = player === 1 ? counts.redKings : counts.blackKings
  const oppKings = player === 1 ? counts.blackKings : counts.redKings

  score += (myPieces - oppPieces) * weights.piece
  score += (myKings - oppKings) * weights.king

  // Position evaluation (only for medium/hard)
  if (difficulty !== 'easy') {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (!piece) continue

        const posValue = piece.player === player ? 1 : -1

        // Center control
        if (CENTER_SQUARES.has(`${row},${col}`)) {
          score += posValue * weights.center
        }

        // Back row protection (prevent opponent from kinging easily)
        if (piece.type === 'regular') {
          if (piece.player === 1 && row === 7) {
            score += posValue * weights.backRow
          } else if (piece.player === 2 && row === 0) {
            score += posValue * weights.backRow
          }
        }
      }
    }

    // Mobility (number of available moves)
    const myMoves = getAllValidMoves(board, player).length
    const oppMoves = getAllValidMoves(board, player === 1 ? 2 : 1).length
    score += (myMoves - oppMoves) * weights.mobility
  }

  return score
}

/** Minimax with alpha-beta pruning. Returns best score and associated move. */
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  player: Player,
  difficulty: Difficulty
): { score: number; move: ValidMove | null } {
  // Base case: depth reached or game over
  const gameOver = checkGameOver(board, maximizingPlayer ? player : (player === 1 ? 2 : 1))

  if (depth === 0 || gameOver.isOver) {
    if (gameOver.isOver) {
      // Big bonus/penalty for winning/losing
      if (gameOver.winner === player) {
        return { score: SCORE.WIN, move: null }
      } else if (gameOver.winner !== null) {
        return { score: SCORE.LOSS, move: null }
      }
    }
    return { score: evaluateBoard(board, player, difficulty), move: null }
  }

  const currentPlayer = maximizingPlayer ? player : (player === 1 ? 2 : 1)
  const validMoves = getAllValidMoves(board, currentPlayer)

  if (validMoves.length === 0) {
    // No moves available - player loses
    return { score: maximizingPlayer ? SCORE.LOSS : SCORE.WIN, move: null }
  }

  let bestMove: ValidMove | null = null

  if (maximizingPlayer) {
    let maxScore = -Infinity

    for (const move of validMoves) {
      const newBoard = applyMove(board, move)
      const { score } = minimax(newBoard, depth - 1, alpha, beta, false, player, difficulty)

      if (score > maxScore) {
        maxScore = score
        bestMove = move
      }

      alpha = Math.max(alpha, score)
      if (beta <= alpha) {
        break // Beta cutoff
      }
    }

    return { score: maxScore, move: bestMove }
  } else {
    let minScore = Infinity

    for (const move of validMoves) {
      const newBoard = applyMove(board, move)
      const { score } = minimax(newBoard, depth - 1, alpha, beta, true, player, difficulty)

      if (score < minScore) {
        minScore = score
        bestMove = move
      }

      beta = Math.min(beta, score)
      if (beta <= alpha) {
        break // Alpha cutoff
      }
    }

    return { score: minScore, move: bestMove }
  }
}

/** Main AI entry point. Returns the best move for the given player and difficulty. */
export function getAIMove(
  board: Board,
  player: Player,
  difficulty: Difficulty
): ValidMove | null {
  const validMoves = getAllValidMoves(board, player)

  if (validMoves.length === 0) return null

  // Random chance to make a random move (for easier difficulties)
  const weights = EVAL_WEIGHTS[difficulty]
  if (Math.random() < weights.randomness) {
    return validMoves[Math.floor(Math.random() * validMoves.length)]
  }

  // Determine search depth based on difficulty
  const depth = AI_DEPTH[difficulty]

  // Use minimax to find the best move
  const { move } = minimax(board, depth, -Infinity, Infinity, true, player, difficulty)

  // Fallback to random move if minimax fails
  return move || validMoves[Math.floor(Math.random() * validMoves.length)]
}
