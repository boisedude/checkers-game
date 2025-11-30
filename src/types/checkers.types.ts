/**
 * Checkers Game Type Definitions
 */

// Player identifiers
export type Player = 1 | 2 // 1 = Red (Player), 2 = Black (AI)

// Piece type
export type PieceType = 'regular' | 'king'

// Cell value can be a piece or null
export interface Piece {
  player: Player
  type: PieceType
}

export type CellValue = Piece | null

// Game board: 8x8 grid (but only 32 dark squares are used)
export const BOARD_SIZE = 8

// Board state (8x8 grid)
export type Board = CellValue[][]

// Game status
export type GameStatus = 'playing' | 'won' | 'draw'

// Game mode
export type GameMode = 'pvp' | 'pvc' // Player vs Player or Player vs Computer

// AI difficulty levels with personality
export type Difficulty = 'easy' | 'medium' | 'hard'

// Position on the board
export interface Position {
  row: number
  col: number
}

// A single jump (capture)
export interface Jump {
  from: Position
  to: Position
  captured: Position // Position of the captured piece
}

// Move representation (can be a simple move or a sequence of jumps)
export interface Move {
  from: Position
  to: Position
  jumps: Jump[] // Empty for simple moves, contains captures for jump moves
  player: Player
  becameKing: boolean // True if piece became king on this move
}

// Valid move with metadata
export interface ValidMove {
  from: Position
  to: Position
  jumps: Jump[]
  score?: number // For AI evaluation
}

// Complete game state
export interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  mode: GameMode
  difficulty: Difficulty
  moveHistory: Move[]
  lastMove?: Move
  redCount: number // Player's piece count
  blackCount: number // AI's piece count
  redKings: number // Player's king count
  blackKings: number // AI's king count
  validMoves: ValidMove[] // Valid moves for current player
  selectedPiece?: Position // Currently selected piece (for UI)
  mustJump: boolean // True if current player must make a jump
}

// Leaderboard entry
export interface LeaderboardEntry {
  playerName: string
  wins: number
  losses: number
  draws: number
  winStreak: number
  longestWinStreak: number
  totalCaptures: number // Total pieces captured
  kingsCreated: number // Total kings created
  perfectGames: number // Games where opponent had 0 pieces
  totalGames: number
  multiJumps: number // Number of times performed multi-jump moves
}

// Saved game state
export interface SavedGame extends GameState {
  savedAt: number
}

// Direction vectors for diagonal movement (4 directions)
export const DIRECTIONS = [
  [-1, -1], // NW
  [-1, 1],  // NE
  [1, -1],  // SW
  [1, 1],   // SE
] as const

export type Direction = typeof DIRECTIONS[number]

// Forward directions for regular pieces (player 1 moves up, player 2 moves down)
export const FORWARD_DIRECTIONS: Record<Player, Direction[]> = {
  1: [[-1, -1], [-1, 1]],  // Red moves up
  2: [[1, -1], [1, 1]],    // Black moves down
} as const
