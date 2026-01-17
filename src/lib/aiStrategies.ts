/**
 * Checkers AI Strategies
 * Implements minimax with alpha-beta pruning for different difficulty levels
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
  easy: 2,    // Bella: very shallow search
  medium: 4,  // Coop: moderate search
  hard: 6,    // Bentley: deep search
} as const

// Scoring constants for game evaluation
const SCORE = {
  WIN: 10000,
  LOSS: -10000,
} as const

// Random move chance for easy difficulty (20%)
const EASY_RANDOM_MOVE_CHANCE = 0.2

/**
 * Evaluation weights for different difficulty levels
 */
const EVAL_WEIGHTS = {
  easy: {
    piece: 100,
    king: 150,
    backRow: 10,
    center: 5,
    mobility: 1,
    randomness: 0.3, // 30% chance of random move
  },
  medium: {
    piece: 100,
    king: 180,
    backRow: 15,
    center: 10,
    mobility: 2,
    randomness: 0.05, // 5% chance of random move
  },
  hard: {
    piece: 100,
    king: 200,
    backRow: 20,
    center: 15,
    mobility: 3,
    randomness: 0, // No randomness
  },
}

/**
 * Center squares (more valuable for board control)
 */
const CENTER_SQUARES = new Set([
  '2,2', '2,3', '2,4', '2,5',
  '3,2', '3,3', '3,4', '3,5',
  '4,2', '4,3', '4,4', '4,5',
  '5,2', '5,3', '5,4', '5,5',
])

/**
 * Evaluates the board position for a player
 * Positive score = good for player, negative = bad for player
 */
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

/**
 * Minimax algorithm with alpha-beta pruning
 */
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

/**
 * Gets the best move for the AI
 */
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

  // For easy mode, occasionally make a suboptimal move
  if (difficulty === 'easy' && validMoves.length > 1 && Math.random() < EASY_RANDOM_MOVE_CHANCE) {
    // Return a random move from the shuffled moves
    const shuffled = [...validMoves].sort(() => Math.random() - 0.5)
    return shuffled[0]
  }

  // Use minimax to find the best move
  const { move } = minimax(board, depth, -Infinity, Infinity, true, player, difficulty)

  // Fallback to random move if minimax fails
  return move || validMoves[Math.floor(Math.random() * validMoves.length)]
}
