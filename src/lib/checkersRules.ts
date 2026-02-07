/**
 * Checkers Rules Engine
 *
 * Pure functions implementing standard American Checkers (8x8, forced captures).
 * Exports: createEmptyBoard, createInitialBoard, isValidPosition, isDarkSquare,
 * getValidMovesForPiece, getAllValidMoves, applyMove, countPieces, hashBoard,
 * checkGameOver, computeNextGameState, createInitialGameState.
 *
 * Key rule: if any jump is available, ALL moves must be jumps (forced capture).
 * Kings move in all 4 diagonal directions; regulars only move forward.
 * Draw conditions: 40-move rule (no capture/promotion) and 3-fold repetition.
 */

import type {
  Board,
  Player,
  Position,
  ValidMove,
  Jump,
  GameState,
  Piece,
} from '@/types/checkers.types'
import { BOARD_SIZE, DIRECTIONS, FORWARD_DIRECTIONS } from '@/types/checkers.types'
import { DRAW_MOVE_LIMIT, REPETITION_DRAW_COUNT } from '@/lib/gameConstants'

/** Creates an empty 8x8 board (all null). */
export function createEmptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
}

/** Initial board: P2/Black rows 0-2, P1/Red rows 5-7, dark squares only. */
export function createInitialBoard(): Board {
  const board = createEmptyBoard()

  // Place Player 2 (Black/AI) pieces on rows 0-2
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Only place on dark squares (where row + col is odd)
      if ((row + col) % 2 === 1) {
        board[row][col] = { player: 2, type: 'regular' }
      }
    }
  }

  // Place Player 1 (Red/Player) pieces on rows 5-7
  for (let row = 5; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Only place on dark squares (where row + col is odd)
      if ((row + col) % 2 === 1) {
        board[row][col] = { player: 1, type: 'regular' }
      }
    }
  }

  return board
}

/** Bounds check: is (row, col) within the 8x8 grid? */
export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

/** Dark squares (row+col is odd) are the only playable squares. */
export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1
}

/** Recursively finds all jump sequences from a position. Handles multi-jumps. */
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
      ((piece.player === 1 && landRow === 0) || (piece.player === 2 && landRow === BOARD_SIZE - 1))

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

/** Gets all non-capture diagonal moves from a position. */
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

/** Gets valid moves for one piece. Returns only jumps if jumps exist (forced capture). */
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

/** Gets all valid moves for a player. Returns only jumps if any jump exists. */
export function getAllValidMoves(board: Board, player: Player): ValidMove[] {
  const allMoves: ValidMove[] = []
  const allJumps: ValidMove[] = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
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

/** Applies a move to the board. Returns new board (immutable). Handles captures and king promotion. */
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
        (piece.player === 2 && move.to.row === BOARD_SIZE - 1)) {
      newBoard[move.to.row][move.to.col] = { ...piece, type: 'king' }
    }
  }

  return newBoard
}

/** Counts pieces and kings for both players. */
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

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
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

/** Deterministic board hash for 3-fold repetition detection. Format: "player:cells". */
export function hashBoard(board: Board, currentPlayer: Player): string {
  const cells: string[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece === null) {
        cells.push('0')
      } else if (piece.player === 1 && piece.type === 'regular') {
        cells.push('1')
      } else if (piece.player === 1 && piece.type === 'king') {
        cells.push('2')
      } else if (piece.player === 2 && piece.type === 'regular') {
        cells.push('3')
      } else {
        cells.push('4')
      }
    }
  }
  return `${currentPlayer}:${cells.join('')}`
}

/** Checks game-over conditions: no moves, no pieces, 40-move rule, 3-fold repetition. */
export function checkGameOver(
  board: Board,
  currentPlayer: Player,
  movesWithoutCaptureOrPromotion?: number,
  positionHistory?: string[]
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

  // 40-move rule: draw if 40 moves without a capture or promotion
  if (movesWithoutCaptureOrPromotion !== undefined && movesWithoutCaptureOrPromotion >= DRAW_MOVE_LIMIT) {
    return { isOver: true, winner: null, isDraw: true }
  }

  // 3-fold repetition: draw if the same position has occurred 3+ times
  if (positionHistory !== undefined) {
    const currentHash = hashBoard(board, currentPlayer)
    const count = positionHistory.filter(h => h === currentHash).length
    if (count >= REPETITION_DRAW_COUNT) {
      return { isOver: true, winner: null, isDraw: true }
    }
  }

  // Game continues
  return { isOver: false, winner: null, isDraw: false }
}

/**
 * Pure state transition: applies move and returns new GameState.
 * Handles board update, piece counts, draw detection, game-over, achievement tracking.
 * Does NOT set undoState -- callers handle that based on AI vs player context.
 */
export function computeNextGameState(
  prevState: GameState,
  move: ValidMove
): GameState {
  const newBoard = applyMove(prevState.board, move)
  const counts = countPieces(newBoard)
  const nextPlayer: Player = prevState.currentPlayer === 1 ? 2 : 1

  // Check if piece became king
  const pieceAfter = newBoard[move.to.row][move.to.col]
  const pieceBefore = prevState.board[move.from.row][move.from.col]
  const becameKing = pieceAfter?.type === 'king' && pieceBefore?.type === 'regular'

  // Draw detection counters
  const hadCapture = move.jumps.length > 0
  const newMovesWithoutCaptureOrPromotion =
    hadCapture || becameKing ? 0 : prevState.movesWithoutCaptureOrPromotion + 1
  const newPositionHistory = [
    ...prevState.positionHistory,
    hashBoard(newBoard, nextPlayer),
  ]

  const gameOver = checkGameOver(
    newBoard,
    nextPlayer,
    newMovesWithoutCaptureOrPromotion,
    newPositionHistory
  )
  const validMoves = gameOver.isOver ? [] : getAllValidMoves(newBoard, nextPlayer)

  const moveRecord = {
    from: move.from,
    to: move.to,
    jumps: move.jumps,
    player: prevState.currentPlayer,
    becameKing,
  }

  // Achievement tracking: did the current player capture an opponent's king?
  const capturedKing = hadCapture && move.jumps.some(jump => {
    const capturedPiece = prevState.board[jump.captured.row][jump.captured.col]
    return capturedPiece?.type === 'king'
  })

  return {
    ...prevState,
    board: newBoard,
    currentPlayer: nextPlayer,
    status: gameOver.isOver ? (gameOver.isDraw ? 'draw' : 'won') : 'playing',
    winner: gameOver.winner,
    moveHistory: [...prevState.moveHistory, moveRecord],
    lastMove: moveRecord,
    ...counts,
    validMoves,
    mustJump: validMoves.some(m => m.jumps.length > 0),
    undoState: null, // Callers set this based on AI vs player context
    movesWithoutCaptureOrPromotion: newMovesWithoutCaptureOrPromotion,
    positionHistory: newPositionHistory,
    hadKingCaptured: prevState.hadKingCaptured || capturedKing,
    wasDownBy3OrMore: prevState.wasDownBy3OrMore || (counts.blackCount - counts.redCount >= 3),
  }
}

/** Creates a fresh game state with initial board, ready for play. */
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
    mustJump: validMoves.some(m => m.jumps.length > 0),
    undoState: null,
    movesWithoutCaptureOrPromotion: 0,
    positionHistory: [],
    hadKingCaptured: false,
    wasDownBy3OrMore: false,
  }
}

