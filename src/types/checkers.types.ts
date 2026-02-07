/**
 * Checkers Game Type Definitions
 *
 * Core domain types for the checkers game engine.
 * Exports: Player, Piece, Board, GameState, Move, ValidMove, UndoState,
 * LeaderboardEntry, BOARD_SIZE, DIRECTIONS, FORWARD_DIRECTIONS.
 *
 * Player 1 = Red (human), Player 2 = Black (AI or second human).
 * Board is 8x8 but only dark squares (row+col is odd) hold pieces.
 */

export type Player = 1 | 2
export type PieceType = 'regular' | 'king'

export interface Piece {
  player: Player
  type: PieceType
}

export type CellValue = Piece | null
export const BOARD_SIZE = 8
export type Board = CellValue[][]

/** Game lifecycle: setup -> playing -> won | draw */
export type GameStatus = 'setup' | 'playing' | 'won' | 'draw'
export type GameMode = 'pvp' | 'pvc'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Position {
  row: number
  col: number
}

/** A single capture within a move. Multi-jumps contain multiple Jumps. */
export interface Jump {
  from: Position
  to: Position
  captured: Position
}

/** Recorded move. jumps=[] for simple moves. becameKing for promotion tracking. */
export interface Move {
  from: Position
  to: Position
  jumps: Jump[]
  player: Player
  becameKing: boolean
}

/** Candidate move for selection/AI. score is optionally set by AI evaluation. */
export interface ValidMove {
  from: Position
  to: Position
  jumps: Jump[]
  score?: number
}

/** Snapshot for single-level undo. Stored before player's move. */
export interface UndoState {
  board: Board
  currentPlayer: Player
  lastMove?: Move
  redCount: number
  blackCount: number
  redKings: number
  blackKings: number
  validMoves: ValidMove[]
  mustJump: boolean
}

/** Complete game state. Central data structure for the entire game. */
export interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  mode: GameMode
  difficulty: Difficulty
  moveHistory: Move[]
  lastMove?: Move
  redCount: number
  blackCount: number
  redKings: number
  blackKings: number
  validMoves: ValidMove[]
  selectedPiece?: Position
  mustJump: boolean
  undoState: UndoState | null
  /** Counter for 40-move draw rule (resets on capture or promotion) */
  movesWithoutCaptureOrPromotion: number
  /** Board hashes for 3-fold repetition draw detection */
  positionHistory: string[]
  /** Achievement tracking: did player capture an opponent king this game */
  hadKingCaptured: boolean
  /** Achievement tracking: was player ever down 3+ pieces */
  wasDownBy3OrMore: boolean
}

/** Single-player cumulative stats, persisted in localStorage. */
export interface LeaderboardEntry {
  playerName: string
  wins: number
  losses: number
  draws: number
  winStreak: number
  longestWinStreak: number
  largestWinMargin: number
  perfectGames: number
  totalGames: number
  totalCaptures: number
}

/** All four diagonal directions as [row_delta, col_delta]. */
export const DIRECTIONS = [
  [-1, -1], // NW
  [-1, 1],  // NE
  [1, -1],  // SW
  [1, 1],   // SE
] as const

export type Direction = typeof DIRECTIONS[number]

/** Forward-only directions per player. Red moves up (row decreases), Black moves down. */
export const FORWARD_DIRECTIONS: Record<Player, Direction[]> = {
  1: [[-1, -1], [-1, 1]],
  2: [[1, -1], [1, 1]],
} as const
