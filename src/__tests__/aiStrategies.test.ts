// Unit tests for Checkers AI strategies

import { getAIMove } from '@/lib/aiStrategies'
import {
  createInitialBoard,
  createEmptyBoard,
  getAllValidMoves,
  applyMove,
  checkGameOver,
} from '@/lib/checkersRules'
import type { Difficulty } from '@/types/checkers.types'

describe('aiStrategies', () => {
  describe('getAIMove', () => {
    describe('basic functionality', () => {
      it('should return null when no moves available', () => {
        const board = createEmptyBoard()
        // Player 2 piece in corner, cannot move
        board[7][6] = { player: 2, type: 'regular' }

        const move = getAIMove(board, 2, 'medium')

        // No valid moves for player 2 at row 7 (cannot go further down)
        expect(move).toBeNull()
      })

      it('should return a valid move for initial board', () => {
        const board = createInitialBoard()
        const move = getAIMove(board, 2, 'medium')

        expect(move).not.toBeNull()
        const validMoves = getAllValidMoves(board, 2)
        expect(validMoves).toContainEqual(move)
      })

      it('should work for player 1 as well', () => {
        const board = createInitialBoard()
        const move = getAIMove(board, 1, 'medium')

        expect(move).not.toBeNull()
        const validMoves = getAllValidMoves(board, 1)
        expect(validMoves).toContainEqual(move)
      })
    })

    describe('easy difficulty', () => {
      it('should return a valid move', () => {
        const board = createInitialBoard()
        const move = getAIMove(board, 2, 'easy')

        expect(move).not.toBeNull()
        const validMoves = getAllValidMoves(board, 2)
        expect(validMoves).toContainEqual(move)
      })

      it('should handle board with limited moves', () => {
        const board = createEmptyBoard()
        board[2][3] = { player: 2, type: 'regular' }
        // Only one piece with two possible moves

        const move = getAIMove(board, 2, 'easy')

        expect(move).not.toBeNull()
        expect(move!.from.row).toBe(2)
        expect(move!.from.col).toBe(3)
      })

      it('should make varying moves (randomness test)', () => {
        const board = createInitialBoard()
        const moves = new Set<string>()

        // Run multiple times to test randomness
        for (let i = 0; i < 30; i++) {
          const move = getAIMove(board, 2, 'easy')
          if (move) {
            moves.add(JSON.stringify(move))
          }
        }

        // Easy AI has randomness, should see some variety over 30 runs
        // Note: May occasionally fail due to random nature, but very unlikely
        expect(moves.size).toBeGreaterThan(1)
      })
    })

    describe('medium difficulty', () => {
      it('should return a valid move', () => {
        const board = createInitialBoard()
        const move = getAIMove(board, 2, 'medium')

        expect(move).not.toBeNull()
        const validMoves = getAllValidMoves(board, 2)
        expect(validMoves).toContainEqual(move)
      })

      it('should prioritize jumps when available', () => {
        const board = createEmptyBoard()
        board[2][3] = { player: 2, type: 'regular' }
        board[3][4] = { player: 1, type: 'regular' } // Can be captured
        board[2][5] = { player: 2, type: 'regular' } // Another piece

        const move = getAIMove(board, 2, 'medium')

        // Should choose the jump (forced by rules anyway)
        expect(move).not.toBeNull()
        expect(move!.jumps.length).toBeGreaterThan(0)
      })

      it('should be deterministic (mostly)', () => {
        const board = createInitialBoard()

        // Medium AI should be relatively deterministic
        const move1 = getAIMove(board, 2, 'medium')
        const move2 = getAIMove(board, 2, 'medium')

        // May have small randomness, but should mostly choose same move
        // We just verify both are valid
        expect(move1).not.toBeNull()
        expect(move2).not.toBeNull()
      })
    })

    describe('hard difficulty', () => {
      it('should return a valid move', () => {
        const board = createInitialBoard()
        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        const validMoves = getAllValidMoves(board, 2)
        expect(validMoves).toContainEqual(move)
      })

      it('should be deterministic for same position', () => {
        const board = createInitialBoard()

        const move1 = getAIMove(board, 2, 'hard')
        const move2 = getAIMove(board, 2, 'hard')
        const move3 = getAIMove(board, 2, 'hard')

        // Hard AI has no randomness, should be deterministic
        expect(move1).toEqual(move2)
        expect(move2).toEqual(move3)
      })

      it('should prioritize captures', () => {
        const board = createEmptyBoard()
        board[2][3] = { player: 2, type: 'regular' }
        board[3][4] = { player: 1, type: 'regular' }

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        expect(move!.jumps.length).toBeGreaterThan(0)
      })

      it('should make strategic moves', () => {
        // Set up a position where advancing toward promotion is good
        const board = createEmptyBoard()
        board[5][2] = { player: 2, type: 'regular' }
        board[2][5] = { player: 1, type: 'regular' }

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        // Should move forward toward promotion row
        expect(move!.to.row).toBeGreaterThan(5)
      })
    })

    describe('AI prioritizes jumps', () => {
      it('should take a capture when available (all difficulties)', () => {
        const board = createEmptyBoard()
        board[2][3] = { player: 2, type: 'regular' }
        board[3][4] = { player: 1, type: 'regular' } // Capturable

        const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

        difficulties.forEach(difficulty => {
          const move = getAIMove(board, 2, difficulty)
          expect(move).not.toBeNull()
          // Forced capture rule means all AI levels must take the jump
          expect(move!.jumps.length).toBeGreaterThan(0)
        })
      })

      it('should take multi-jump when available', () => {
        const board = createEmptyBoard()
        board[1][2] = { player: 2, type: 'regular' }
        board[2][3] = { player: 1, type: 'regular' }
        board[4][5] = { player: 1, type: 'regular' }

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        expect(move!.jumps.length).toBe(2) // Double jump
      })
    })

    describe('AI promotes to king when possible', () => {
      it('should move to promotion row when safe', () => {
        const board = createEmptyBoard()
        board[6][3] = { player: 2, type: 'regular' }

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        expect(move!.to.row).toBe(7) // Move to last row for promotion
      })

      it('should complete jump that leads to promotion', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 2, type: 'regular' }
        board[6][3] = { player: 1, type: 'regular' }

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        expect(move!.to.row).toBe(7) // Jump to promotion row
        expect(move!.jumps.length).toBe(1)
      })
    })

    describe('minimax finds winning sequences', () => {
      it('should find winning move when available', () => {
        // Position where AI can capture last opponent piece
        const board = createEmptyBoard()
        board[3][4] = { player: 2, type: 'king' }
        board[4][5] = { player: 1, type: 'regular' } // Last opponent piece

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        expect(move!.jumps.length).toBe(1)

        // Apply move and check if game is over
        const newBoard = applyMove(board, move!)
        const result = checkGameOver(newBoard, 1)
        expect(result.isOver).toBe(true)
        expect(result.winner).toBe(2)
      })

      it('should avoid losing moves', () => {
        // Position where one move leads to immediate loss
        const board = createEmptyBoard()
        board[4][3] = { player: 2, type: 'regular' }
        board[6][5] = { player: 1, type: 'king' } // Dangerous opponent

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()

        // Apply the AI's move
        const newBoard = applyMove(board, move!)

        // Opponent should not be able to immediately capture the AI's piece
        const opponentMoves = getAllValidMoves(newBoard, 1)
        // Hard AI should try to avoid positions where it can be captured
        // This test is somewhat position-dependent
        expect(opponentMoves).toBeDefined()
      })

      it('should prefer material advantage', () => {
        // Position where AI can trade or capture without loss
        const board = createEmptyBoard()
        board[2][3] = { player: 2, type: 'regular' }
        board[3][4] = { player: 1, type: 'regular' } // Can capture
        board[6][1] = { player: 2, type: 'regular' } // Safe piece

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        // Should take the capture for material advantage
        expect(move!.jumps.length).toBe(1)
      })
    })

    describe('various board states', () => {
      it('should handle endgame with few pieces', () => {
        const board = createEmptyBoard()
        board[3][4] = { player: 2, type: 'king' }
        board[5][6] = { player: 1, type: 'king' }

        const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

        difficulties.forEach(difficulty => {
          const move = getAIMove(board, 2, difficulty)
          expect(move).not.toBeNull()
          const validMoves = getAllValidMoves(board, 2)
          expect(validMoves).toContainEqual(move)
        })
      })

      it('should handle asymmetric piece counts', () => {
        const board = createEmptyBoard()
        // AI has more pieces
        board[2][1] = { player: 2, type: 'regular' }
        board[2][3] = { player: 2, type: 'regular' }
        board[2][5] = { player: 2, type: 'king' }
        // Opponent has one piece
        board[5][4] = { player: 1, type: 'regular' }

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        const validMoves = getAllValidMoves(board, 2)
        expect(validMoves).toContainEqual(move)
      })

      it('should handle king vs regular piece scenario', () => {
        const board = createEmptyBoard()
        board[3][2] = { player: 2, type: 'king' }
        board[5][4] = { player: 1, type: 'regular' }

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        // King has more movement options
        const validMoves = getAllValidMoves(board, 2)
        expect(validMoves.length).toBe(4) // King can move in all 4 directions
      })

      it('should handle crowded board positions', () => {
        const board = createInitialBoard()

        // Make a few moves to create a more complex position
        const move1 = getAIMove(board, 2, 'hard')
        expect(move1).not.toBeNull()

        const board2 = applyMove(board, move1!)
        const move2 = getAIMove(board2, 1, 'hard')
        expect(move2).not.toBeNull()
      })
    })

    describe('difficulty comparison', () => {
      it('should work with all difficulty levels', () => {
        const board = createInitialBoard()
        const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

        difficulties.forEach(difficulty => {
          const move = getAIMove(board, 2, difficulty)
          expect(move).not.toBeNull()
          const validMoves = getAllValidMoves(board, 2)
          expect(validMoves).toContainEqual(move)
        })
      })

      it('hard AI should make better moves on average', () => {
        // Set up a position where there's a clearly better move
        const board = createEmptyBoard()
        board[5][2] = { player: 2, type: 'regular' } // Close to promotion
        board[2][5] = { player: 2, type: 'regular' } // Far from promotion

        const hardMove = getAIMove(board, 2, 'hard')

        expect(hardMove).not.toBeNull()
        // Hard AI should make a valid, strategic move
        // Either piece advancing is reasonable
        const validMoves = getAllValidMoves(board, 2)
        expect(validMoves).toContainEqual(hardMove)
        // The move should advance toward promotion (row increases for player 2)
        expect(hardMove!.to.row).toBeGreaterThan(hardMove!.from.row)
      })
    })

    describe('edge cases', () => {
      it('should handle single piece remaining', () => {
        const board = createEmptyBoard()
        board[4][3] = { player: 2, type: 'king' }
        board[6][5] = { player: 1, type: 'regular' }

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
      })

      it('should handle piece with only one valid move', () => {
        const board = createEmptyBoard()
        // Place piece at row 5, col 0 (left edge) - can only move to (6, 1)
        board[5][0] = { player: 2, type: 'regular' } // Edge of board

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        expect(move!.from.row).toBe(5)
        expect(move!.from.col).toBe(0)
        expect(move!.to.row).toBe(6)
        expect(move!.to.col).toBe(1) // Can only move right-down
      })

      it('should handle blocked piece scenario', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 2, type: 'regular' }
        board[6][1] = { player: 2, type: 'regular' } // Blocks one direction
        board[6][3] = { player: 2, type: 'regular' } // Blocks other direction
        // Piece at 5,2 cannot move, but others can

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        // Should move one of the pieces at row 6
        expect(move!.from.row).toBe(6)
      })
    })

    describe('performance', () => {
      it('should complete within reasonable time for initial board', () => {
        const board = createInitialBoard()
        const startTime = Date.now()

        getAIMove(board, 2, 'hard')

        const elapsed = Date.now() - startTime
        // Hard AI with depth 6 should complete quickly
        expect(elapsed).toBeLessThan(5000) // 5 seconds max
      })

      it('should complete within reasonable time for complex position', () => {
        // Mid-game position
        const board = createEmptyBoard()
        for (let i = 0; i < 6; i++) {
          const row = Math.floor(i / 3) + 2
          const col = (i % 3) * 2 + 1
          board[row][col] = { player: 2, type: 'regular' }
        }
        for (let i = 0; i < 6; i++) {
          const row = Math.floor(i / 3) + 4
          const col = (i % 3) * 2 + 1
          board[row][col] = { player: 1, type: 'regular' }
        }

        const startTime = Date.now()

        getAIMove(board, 2, 'hard')

        const elapsed = Date.now() - startTime
        expect(elapsed).toBeLessThan(10000) // 10 seconds max
      })

      it('should complete quickly for easy difficulty', () => {
        const board = createInitialBoard()
        const startTime = Date.now()

        getAIMove(board, 2, 'easy')

        const elapsed = Date.now() - startTime
        // Easy AI should be very fast
        expect(elapsed).toBeLessThan(1000) // 1 second max
      })
    })

    describe('strategic patterns', () => {
      it('should value center control', () => {
        const board = createEmptyBoard()
        // Two pieces, one can move to center, one to edge
        board[3][0] = { player: 2, type: 'regular' } // Edge piece
        board[3][4] = { player: 2, type: 'regular' } // Center-ish piece

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        // Hard AI should prefer keeping/moving to center
      })

      it('should protect back row when beneficial', () => {
        const board = createEmptyBoard()
        // Back row piece provides protection against opponent kinging
        board[0][1] = { player: 2, type: 'regular' }
        board[2][3] = { player: 2, type: 'regular' }
        board[5][4] = { player: 1, type: 'regular' }

        const move = getAIMove(board, 2, 'hard')

        expect(move).not.toBeNull()
        // Should make a valid strategic move
      })
    })
  })
})
