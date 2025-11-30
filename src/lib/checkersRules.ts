/**
 * Checkers Game Rules and Logic
 * Implements standard American Checkers (8x8 board, forced captures, flying kings)
 */

import type {
  Board,
  Player,
  Position,
  Move,
  ValidMove,
  Jump,
  GameState,
  Piece,
} from '@/types/checkers.types'
import { DIRECTIONS, FORWARD_DIRECTIONS } from '@/types/checkers.types'

/**
 * Creates an empty 8x8 board
 */
export function createEmptyBoard(): Board {
  return Array(8).fill(null).map(() => Array(8).fill(null))
}

/**
 * Creates initial checkers board setup
 * Player 1 (Red) on bottom (rows 5-7)
 * Player 2 (Black) on top (rows 0-2)
 * Only dark squares are used
 */
export function createInitialBoard(): Board {
  const board = createEmptyBoard()

  // Place Player 2 (Black/AI) pieces on rows 0-2
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      // Only place on dark squares (where row + col is odd)
      if ((row + col) % 2 === 1) {
        board[row][col] = { player: 2, type: 'regular' }
      }
    }
  }

  // Place Player 1 (Red/Player) pieces on rows 5-7
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      // Only place on dark squares (where row + col is odd)
      if ((row + col) % 2 === 1) {
        board[row][col] = { player: 1, type: 'regular' }
      }
    }
  }

  return board
}

/**
 * Checks if a position is on the board
 */
export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8
}

/**
 * Checks if a position is a dark square (where pieces can be)
 */
export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1
}

/**
 * Gets all positions that can capture from a given position (for jump moves)
 */
function getJumpMoves(
  board: Board,
  from: Position,
  piece: Piece,
  visitedCaptures: Set<string> = new Set()
): ValidMove[] {
  const moves: ValidMove[] = []
  const directions = piece.type === 'king' ? DIRECTIONS : FORWARD_DIRECTIONS[piece.player]

  for (const [dr, dc] of directions) {
    const jumpOverRow = from.row + dr
    const jumpOverCol = from.col + dc
    const landRow = from.row + dr * 2
    const landCol = from.col + dc * 2

    // Check if jump is valid
    if (!isValidPosition(landRow, landCol)) continue
    if (!isDarkSquare(landRow, landCol)) continue

    const jumpOverPiece = board[jumpOverRow]?.[jumpOverCol]
    const landCell = board[landRow]?.[landCol]

    // Can only jump over opponent's piece to an empty square
    if (!jumpOverPiece || jumpOverPiece.player === piece.player) continue
    if (landCell !== null) continue

    // Don't capture the same piece twice in a multi-jump
    const captureKey = `${jumpOverRow},${jumpOverCol}`
    if (visitedCaptures.has(captureKey)) continue

    const jump: Jump = {
      from,
      to: { row: landRow, col: landCol },
      captured: { row: jumpOverRow, col: jumpOverCol }
    }

    // Simulate the jump to check for additional jumps
    const newBoard = board.map(row => [...row])
    newBoard[landRow][landCol] = newBoard[from.row][from.col]
    newBoard[from.row][from.col] = null
    newBoard[jumpOverRow][jumpOverCol] = null

    // Check if piece becomes a king after this jump
    const becomesKing = piece.type === 'regular' &&
      ((piece.player === 1 && landRow === 0) || (piece.player === 2 && landRow === 7))

    // If becomes king, it can't continue jumping in the same turn (standard rules)
    const pieceAfterJump: Piece = becomesKing ? { ...piece, type: 'king' } : piece

    const newVisited = new Set(visitedCaptures)
    newVisited.add(captureKey)

    // Look for additional jumps from the landing position
    const additionalJumps = becomesKing ? [] : getJumpMoves(
      newBoard,
      { row: landRow, col: landCol },
      pieceAfterJump,
      newVisited
    )

    if (additionalJumps.length > 0) {
      // Multi-jump: add each continuation as a separate move
      for (const additionalMove of additionalJumps) {
        moves.push({
          from,
          to: additionalMove.to,
          jumps: [jump, ...additionalMove.jumps]
        })
      }
    } else {
      // Single jump
      moves.push({
        from,
        to: { row: landRow, col: landCol },
        jumps: [jump]
      })
    }
  }

  return moves
}

/**
 * Gets all simple (non-capture) moves from a position
 */
function getSimpleMoves(board: Board, from: Position, piece: Piece): ValidMove[] {
  const moves: ValidMove[] = []
  const directions = piece.type === 'king' ? DIRECTIONS : FORWARD_DIRECTIONS[piece.player]

  for (const [dr, dc] of directions) {
    const toRow = from.row + dr
    const toCol = from.col + dc

    if (!isValidPosition(toRow, toCol)) continue
    if (!isDarkSquare(toRow, toCol)) continue
    if (board[toRow][toCol] !== null) continue

    moves.push({
      from,
      to: { row: toRow, col: toCol },
      jumps: []
    })
  }

  return moves
}

/**
 * Gets all valid moves for a specific piece
 */
export function getValidMovesForPiece(
  board: Board,
  position: Position
): ValidMove[] {
  const piece = board[position.row][position.col]
  if (!piece) return []

  // Check for jump moves first (captures are forced in checkers)
  const jumpMoves = getJumpMoves(board, position, piece)

  // If jumps are available, only return jumps (forced capture rule)
  if (jumpMoves.length > 0) {
    return jumpMoves
  }

  // Otherwise, return simple moves
  return getSimpleMoves(board, position, piece)
}

/**
 * Gets all valid moves for a player
 */
export function getAllValidMoves(board: Board, player: Player): ValidMove[] {
  const allMoves: ValidMove[] = []
  const allJumps: ValidMove[] = []

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece && piece.player === player) {
        const moves = getValidMovesForPiece(board, { row, col })

        // Separate jumps from simple moves
        const jumps = moves.filter(m => m.jumps.length > 0)
        const simpleMoves = moves.filter(m => m.jumps.length === 0)

        allJumps.push(...jumps)
        allMoves.push(...simpleMoves)
      }
    }
  }

  // If any jumps are available, only return jumps (forced capture)
  return allJumps.length > 0 ? allJumps : allMoves
}

/**
 * Applies a move to the board and returns the new board
 */
export function applyMove(board: Board, move: ValidMove): Board {
  const newBoard = board.map(row => [...row])
  const piece = newBoard[move.from.row][move.from.col]

  if (!piece) return newBoard

  // Remove captured pieces
  for (const jump of move.jumps) {
    newBoard[jump.captured.row][jump.captured.col] = null
  }

  // Move the piece
  newBoard[move.to.row][move.to.col] = piece
  newBoard[move.from.row][move.from.col] = null

  // Check if piece should become a king
  if (piece.type === 'regular') {
    if ((piece.player === 1 && move.to.row === 0) ||
        (piece.player === 2 && move.to.row === 7)) {
      newBoard[move.to.row][move.to.col] = { ...piece, type: 'king' }
    }
  }

  return newBoard
}

/**
 * Counts pieces for each player
 */
export function countPieces(board: Board): {
  redCount: number
  blackCount: number
  redKings: number
  blackKings: number
} {
  let redCount = 0
  let blackCount = 0
  let redKings = 0
  let blackKings = 0

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece) {
        if (piece.player === 1) {
          redCount++
          if (piece.type === 'king') redKings++
        } else {
          blackCount++
          if (piece.type === 'king') blackKings++
        }
      }
    }
  }

  return { redCount, blackCount, redKings, blackKings }
}

/**
 * Checks if the game is over and returns the winner
 */
export function checkGameOver(
  board: Board,
  currentPlayer: Player
): { isOver: boolean; winner: Player | null; isDraw: boolean } {
  const validMoves = getAllValidMoves(board, currentPlayer)
  const { redCount, blackCount } = countPieces(board)

  // Player has no valid moves - loses
  if (validMoves.length === 0) {
    return {
      isOver: true,
      winner: currentPlayer === 1 ? 2 : 1,
      isDraw: false
    }
  }

  // One player has no pieces left
  if (redCount === 0) {
    return { isOver: true, winner: 2, isDraw: false }
  }
  if (blackCount === 0) {
    return { isOver: true, winner: 1, isDraw: false }
  }

  // Game continues
  return { isOver: false, winner: null, isDraw: false }
}

/**
 * Creates initial game state
 */
export function createInitialGameState(
  mode: 'pvp' | 'pvc' = 'pvc',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): GameState {
  const board = createInitialBoard()
  const validMoves = getAllValidMoves(board, 1)
  const counts = countPieces(board)

  return {
    board,
    currentPlayer: 1,
    status: 'playing',
    winner: null,
    mode,
    difficulty,
    moveHistory: [],
    ...counts,
    validMoves,
    mustJump: validMoves.some(m => m.jumps.length > 0)
  }
}

/**
 * Converts a move to a readable notation (e.g., "e3-d4" or "e3xc5xc7")
 */
export function moveToNotation(move: Move | ValidMove): string {
  const fromNotation = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row}`
  const toNotation = `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`

  const separator = move.jumps.length > 0 ? 'x' : '-'

  if (move.jumps.length > 1) {
    // Multi-jump notation: show all intermediate positions
    const positions = [fromNotation]
    for (const jump of move.jumps) {
      positions.push(`${String.fromCharCode(97 + jump.to.col)}${8 - jump.to.row}`)
    }
    return positions.join('x')
  }

  return `${fromNotation}${separator}${toNotation}`
}
