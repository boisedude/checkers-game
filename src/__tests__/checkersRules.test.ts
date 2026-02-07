// Unit tests for Checkers game rules engine

import {
  createInitialBoard,
  createEmptyBoard,
  isValidPosition,
  isDarkSquare,
  getValidMovesForPiece,
  getAllValidMoves,
  applyMove,
  countPieces,
  checkGameOver,
  createInitialGameState,
  hashBoard,
} from '@/lib/checkersRules'
import type { ValidMove } from '@/types/checkers.types'
import { BOARD_SIZE } from '@/types/checkers.types'

describe('checkersRules', () => {
  describe('createEmptyBoard', () => {
    it('should create an 8x8 board', () => {
      const board = createEmptyBoard()
      expect(board.length).toBe(8)
      board.forEach(row => {
        expect(row.length).toBe(8)
      })
    })

    it('should have all null cells', () => {
      const board = createEmptyBoard()
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          expect(board[row][col]).toBeNull()
        }
      }
    })
  })

  describe('createInitialBoard', () => {
    it('should place 12 black pieces in rows 0-2', () => {
      const board = createInitialBoard()
      let blackCount = 0

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const piece = board[row][col]
          if (piece) {
            expect(piece.player).toBe(2)
            expect(piece.type).toBe('regular')
            blackCount++
          }
        }
      }

      expect(blackCount).toBe(12)
    })

    it('should place 12 red pieces in rows 5-7', () => {
      const board = createInitialBoard()
      let redCount = 0

      for (let row = 5; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const piece = board[row][col]
          if (piece) {
            expect(piece.player).toBe(1)
            expect(piece.type).toBe('regular')
            redCount++
          }
        }
      }

      expect(redCount).toBe(12)
    })

    it('should only place pieces on dark squares', () => {
      const board = createInitialBoard()

      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const piece = board[row][col]
          if (piece) {
            expect((row + col) % 2).toBe(1) // Dark squares have odd sum
          }
        }
      }
    })

    it('should have empty middle rows (3-4)', () => {
      const board = createInitialBoard()

      for (let row = 3; row < 5; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          expect(board[row][col]).toBeNull()
        }
      }
    })
  })

  describe('isValidPosition', () => {
    it('should return true for valid positions', () => {
      expect(isValidPosition(0, 0)).toBe(true)
      expect(isValidPosition(7, 7)).toBe(true)
      expect(isValidPosition(3, 4)).toBe(true)
    })

    it('should return false for negative positions', () => {
      expect(isValidPosition(-1, 0)).toBe(false)
      expect(isValidPosition(0, -1)).toBe(false)
      expect(isValidPosition(-1, -1)).toBe(false)
    })

    it('should return false for positions beyond board', () => {
      expect(isValidPosition(8, 0)).toBe(false)
      expect(isValidPosition(0, 8)).toBe(false)
      expect(isValidPosition(8, 8)).toBe(false)
    })
  })

  describe('isDarkSquare', () => {
    it('should identify dark squares correctly', () => {
      // Dark squares have row + col = odd
      expect(isDarkSquare(0, 1)).toBe(true)
      expect(isDarkSquare(1, 0)).toBe(true)
      expect(isDarkSquare(2, 3)).toBe(true)
    })

    it('should identify light squares correctly', () => {
      // Light squares have row + col = even
      expect(isDarkSquare(0, 0)).toBe(false)
      expect(isDarkSquare(1, 1)).toBe(false)
      expect(isDarkSquare(2, 2)).toBe(false)
    })
  })

  describe('getValidMovesForPiece', () => {
    describe('regular pieces', () => {
      it('should return empty array for empty position', () => {
        const board = createEmptyBoard()
        const moves = getValidMovesForPiece(board, { row: 3, col: 3 })
        expect(moves).toEqual([])
      })

      it('should return forward diagonal moves for player 1 (red)', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 1, type: 'regular' }

        const moves = getValidMovesForPiece(board, { row: 5, col: 2 })

        // Player 1 moves up (row decreases)
        expect(moves.length).toBe(2)
        expect(moves.some(m => m.to.row === 4 && m.to.col === 1)).toBe(true)
        expect(moves.some(m => m.to.row === 4 && m.to.col === 3)).toBe(true)
      })

      it('should return forward diagonal moves for player 2 (black)', () => {
        const board = createEmptyBoard()
        board[2][3] = { player: 2, type: 'regular' }

        const moves = getValidMovesForPiece(board, { row: 2, col: 3 })

        // Player 2 moves down (row increases)
        expect(moves.length).toBe(2)
        expect(moves.some(m => m.to.row === 3 && m.to.col === 2)).toBe(true)
        expect(moves.some(m => m.to.row === 3 && m.to.col === 4)).toBe(true)
      })

      it('should not allow backward moves for regular pieces', () => {
        const board = createEmptyBoard()
        board[4][3] = { player: 1, type: 'regular' }

        const moves = getValidMovesForPiece(board, { row: 4, col: 3 })

        // All moves should be forward (row < 4 for player 1)
        moves.forEach(move => {
          expect(move.to.row).toBeLessThan(4)
        })
      })

      it('should be blocked by own pieces', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 1, type: 'regular' }
        board[4][1] = { player: 1, type: 'regular' } // Blocking piece

        const moves = getValidMovesForPiece(board, { row: 5, col: 2 })

        expect(moves.length).toBe(1)
        expect(moves[0].to.row).toBe(4)
        expect(moves[0].to.col).toBe(3)
      })

      it('should respect board edges', () => {
        const board = createEmptyBoard()
        board[5][0] = { player: 1, type: 'regular' } // Left edge

        const moves = getValidMovesForPiece(board, { row: 5, col: 0 })

        expect(moves.length).toBe(1)
        expect(moves[0].to.col).toBe(1)
      })
    })

    describe('king pieces', () => {
      it('should move in all four diagonal directions', () => {
        const board = createEmptyBoard()
        board[4][3] = { player: 1, type: 'king' }

        const moves = getValidMovesForPiece(board, { row: 4, col: 3 })

        expect(moves.length).toBe(4)
        expect(moves.some(m => m.to.row === 3 && m.to.col === 2)).toBe(true) // NW
        expect(moves.some(m => m.to.row === 3 && m.to.col === 4)).toBe(true) // NE
        expect(moves.some(m => m.to.row === 5 && m.to.col === 2)).toBe(true) // SW
        expect(moves.some(m => m.to.row === 5 && m.to.col === 4)).toBe(true) // SE
      })

      it('should be limited by board edges for kings', () => {
        const board = createEmptyBoard()
        board[0][1] = { player: 2, type: 'king' } // Top edge

        const moves = getValidMovesForPiece(board, { row: 0, col: 1 })

        // Can only move down
        expect(moves.length).toBe(2)
        moves.forEach(move => {
          expect(move.to.row).toBe(1)
        })
      })
    })

    describe('jump moves', () => {
      it('should return jump moves when opponent piece is adjacent', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 1, type: 'regular' }
        board[4][3] = { player: 2, type: 'regular' } // Opponent to jump

        const moves = getValidMovesForPiece(board, { row: 5, col: 2 })

        // Should have a jump move
        expect(moves.length).toBeGreaterThan(0)
        expect(moves.some(m => m.jumps.length > 0)).toBe(true)
        expect(moves.some(m => m.to.row === 3 && m.to.col === 4)).toBe(true)
      })

      it('should not jump over own pieces', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 1, type: 'regular' }
        board[4][3] = { player: 1, type: 'regular' } // Own piece - cannot jump

        const moves = getValidMovesForPiece(board, { row: 5, col: 2 })

        // Should have simple move but no jump
        expect(moves.every(m => m.jumps.length === 0)).toBe(true)
      })

      it('should not jump if landing square is occupied', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 1, type: 'regular' }
        board[4][3] = { player: 2, type: 'regular' } // Opponent
        board[3][4] = { player: 1, type: 'regular' } // Landing blocked

        const moves = getValidMovesForPiece(board, { row: 5, col: 2 })

        // No jump to (3,4) since it's occupied
        expect(moves.every(m => !(m.to.row === 3 && m.to.col === 4))).toBe(true)
      })

      it('should capture opponent piece data in jump', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 1, type: 'regular' }
        board[4][3] = { player: 2, type: 'regular' }

        const moves = getValidMovesForPiece(board, { row: 5, col: 2 })
        const jumpMove = moves.find(m => m.jumps.length > 0)

        expect(jumpMove).toBeDefined()
        expect(jumpMove!.jumps[0].captured.row).toBe(4)
        expect(jumpMove!.jumps[0].captured.col).toBe(3)
      })
    })

    describe('multi-jump (double/triple jumps)', () => {
      it('should detect multi-jump opportunities', () => {
        const board = createEmptyBoard()
        board[6][1] = { player: 1, type: 'regular' }
        board[5][2] = { player: 2, type: 'regular' } // First opponent
        board[3][4] = { player: 2, type: 'regular' } // Second opponent

        const moves = getValidMovesForPiece(board, { row: 6, col: 1 })

        // Should have a double jump
        const doubleJump = moves.find(m => m.jumps.length === 2)
        expect(doubleJump).toBeDefined()
        expect(doubleJump!.to.row).toBe(2)
        expect(doubleJump!.to.col).toBe(5)
      })

      it('should stop multi-jump when piece becomes king', () => {
        const board = createEmptyBoard()
        board[2][1] = { player: 1, type: 'regular' }
        board[1][2] = { player: 2, type: 'regular' } // Jump to row 0 (becomes king)

        const moves = getValidMovesForPiece(board, { row: 2, col: 1 })

        // Should have single jump that ends at row 0 (promotion stops the chain)
        const jumpMove = moves.find(m => m.jumps.length > 0)
        expect(jumpMove).toBeDefined()
        expect(jumpMove!.to.row).toBe(0)
      })

      it('should not capture same piece twice in multi-jump', () => {
        // Set up a scenario where the only second jump would require
        // jumping back over an already-captured piece
        const board = createEmptyBoard()
        board[4][3] = { player: 1, type: 'king' }
        board[3][4] = { player: 2, type: 'regular' }

        const moves = getValidMovesForPiece(board, { row: 4, col: 3 })

        // Each jump should only capture one piece
        moves.forEach(move => {
          const capturedPositions = move.jumps.map(
            j => `${j.captured.row},${j.captured.col}`
          )
          const uniqueCaptures = new Set(capturedPositions)
          expect(capturedPositions.length).toBe(uniqueCaptures.size)
        })
      })
    })

    describe('forced jumps', () => {
      it('should only return jump moves when jumps are available', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 1, type: 'regular' }
        board[4][3] = { player: 2, type: 'regular' } // Opponent to jump

        const moves = getValidMovesForPiece(board, { row: 5, col: 2 })

        // All moves should be jumps (forced capture)
        expect(moves.every(m => m.jumps.length > 0)).toBe(true)
      })
    })
  })

  describe('getAllValidMoves', () => {
    it('should return moves for all pieces of the player', () => {
      const board = createInitialBoard()
      const moves = getAllValidMoves(board, 1)

      // Initial position - player 1 can move pieces from row 5
      expect(moves.length).toBeGreaterThan(0)

      // All moves should be from player 1's pieces
      moves.forEach(move => {
        expect(board[move.from.row][move.from.col]?.player).toBe(1)
      })
    })

    it('should enforce forced captures for all pieces', () => {
      const board = createEmptyBoard()
      board[5][2] = { player: 1, type: 'regular' } // Has jump available
      board[4][3] = { player: 2, type: 'regular' } // Opponent
      board[5][6] = { player: 1, type: 'regular' } // No jump available

      const moves = getAllValidMoves(board, 1)

      // Should only return the jump move (forced capture)
      expect(moves.length).toBe(1)
      expect(moves[0].jumps.length).toBeGreaterThan(0)
      expect(moves[0].from.row).toBe(5)
      expect(moves[0].from.col).toBe(2)
    })

    it('should return simple moves when no jumps available', () => {
      const board = createEmptyBoard()
      board[5][2] = { player: 1, type: 'regular' }
      board[5][6] = { player: 1, type: 'regular' }

      const moves = getAllValidMoves(board, 1)

      // Should return all simple moves
      expect(moves.length).toBe(4) // 2 moves per piece
      expect(moves.every(m => m.jumps.length === 0)).toBe(true)
    })

    it('should return empty array when no moves available', () => {
      const board = createEmptyBoard()
      // Player 1 piece blocked by own pieces
      board[5][2] = { player: 1, type: 'regular' }
      board[4][1] = { player: 1, type: 'regular' }
      board[4][3] = { player: 1, type: 'regular' }

      // Only piece at 5,2 exists, but it's blocked
      const moves = getAllValidMoves(board, 1)
        .filter(m => m.from.row === 5 && m.from.col === 2)

      expect(moves.length).toBe(0)
    })
  })

  describe('applyMove', () => {
    describe('simple moves', () => {
      it('should move piece to new position', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 1, type: 'regular' }

        const move: ValidMove = {
          from: { row: 5, col: 2 },
          to: { row: 4, col: 3 },
          jumps: [],
        }

        const newBoard = applyMove(board, move)

        expect(newBoard[5][2]).toBeNull()
        expect(newBoard[4][3]).toEqual({ player: 1, type: 'regular' })
      })

      it('should not modify original board', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 1, type: 'regular' }

        const move: ValidMove = {
          from: { row: 5, col: 2 },
          to: { row: 4, col: 3 },
          jumps: [],
        }

        const newBoard = applyMove(board, move)

        expect(board[5][2]).toEqual({ player: 1, type: 'regular' })
        expect(board[4][3]).toBeNull()
        expect(newBoard).not.toBe(board)
      })
    })

    describe('captures', () => {
      it('should remove captured piece', () => {
        const board = createEmptyBoard()
        board[5][2] = { player: 1, type: 'regular' }
        board[4][3] = { player: 2, type: 'regular' }

        const move: ValidMove = {
          from: { row: 5, col: 2 },
          to: { row: 3, col: 4 },
          jumps: [
            {
              from: { row: 5, col: 2 },
              to: { row: 3, col: 4 },
              captured: { row: 4, col: 3 },
            },
          ],
        }

        const newBoard = applyMove(board, move)

        expect(newBoard[4][3]).toBeNull() // Captured piece removed
        expect(newBoard[3][4]).toEqual({ player: 1, type: 'regular' })
      })

      it('should remove multiple captured pieces in multi-jump', () => {
        const board = createEmptyBoard()
        board[6][1] = { player: 1, type: 'regular' }
        board[5][2] = { player: 2, type: 'regular' }
        board[3][4] = { player: 2, type: 'regular' }

        const move: ValidMove = {
          from: { row: 6, col: 1 },
          to: { row: 2, col: 5 },
          jumps: [
            {
              from: { row: 6, col: 1 },
              to: { row: 4, col: 3 },
              captured: { row: 5, col: 2 },
            },
            {
              from: { row: 4, col: 3 },
              to: { row: 2, col: 5 },
              captured: { row: 3, col: 4 },
            },
          ],
        }

        const newBoard = applyMove(board, move)

        expect(newBoard[5][2]).toBeNull() // First captured
        expect(newBoard[3][4]).toBeNull() // Second captured
        expect(newBoard[2][5]).toEqual({ player: 1, type: 'regular' })
      })
    })

    describe('king promotion', () => {
      it('should promote player 1 piece reaching row 0', () => {
        const board = createEmptyBoard()
        board[1][2] = { player: 1, type: 'regular' }

        const move: ValidMove = {
          from: { row: 1, col: 2 },
          to: { row: 0, col: 3 },
          jumps: [],
        }

        const newBoard = applyMove(board, move)

        expect(newBoard[0][3]).toEqual({ player: 1, type: 'king' })
      })

      it('should promote player 2 piece reaching row 7', () => {
        const board = createEmptyBoard()
        board[6][3] = { player: 2, type: 'regular' }

        const move: ValidMove = {
          from: { row: 6, col: 3 },
          to: { row: 7, col: 4 },
          jumps: [],
        }

        const newBoard = applyMove(board, move)

        expect(newBoard[7][4]).toEqual({ player: 2, type: 'king' })
      })

      it('should not promote when not reaching end row', () => {
        const board = createEmptyBoard()
        board[2][3] = { player: 1, type: 'regular' }

        const move: ValidMove = {
          from: { row: 2, col: 3 },
          to: { row: 1, col: 4 },
          jumps: [],
        }

        const newBoard = applyMove(board, move)

        expect(newBoard[1][4]).toEqual({ player: 1, type: 'regular' })
      })

      it('should promote after jump that lands on promotion row', () => {
        const board = createEmptyBoard()
        board[2][1] = { player: 1, type: 'regular' }
        board[1][2] = { player: 2, type: 'regular' }

        const move: ValidMove = {
          from: { row: 2, col: 1 },
          to: { row: 0, col: 3 },
          jumps: [
            {
              from: { row: 2, col: 1 },
              to: { row: 0, col: 3 },
              captured: { row: 1, col: 2 },
            },
          ],
        }

        const newBoard = applyMove(board, move)

        expect(newBoard[0][3]).toEqual({ player: 1, type: 'king' })
        expect(newBoard[1][2]).toBeNull() // Captured
      })

      it('should not re-promote an already king piece', () => {
        const board = createEmptyBoard()
        board[1][2] = { player: 1, type: 'king' }

        const move: ValidMove = {
          from: { row: 1, col: 2 },
          to: { row: 0, col: 3 },
          jumps: [],
        }

        const newBoard = applyMove(board, move)

        expect(newBoard[0][3]).toEqual({ player: 1, type: 'king' })
      })
    })
  })

  describe('countPieces', () => {
    it('should count initial board pieces correctly', () => {
      const board = createInitialBoard()
      const counts = countPieces(board)

      expect(counts.redCount).toBe(12)
      expect(counts.blackCount).toBe(12)
      expect(counts.redKings).toBe(0)
      expect(counts.blackKings).toBe(0)
    })

    it('should count kings separately', () => {
      const board = createEmptyBoard()
      board[0][1] = { player: 1, type: 'king' }
      board[0][3] = { player: 1, type: 'regular' }
      board[7][2] = { player: 2, type: 'king' }
      board[7][4] = { player: 2, type: 'king' }
      board[7][6] = { player: 2, type: 'regular' }

      const counts = countPieces(board)

      expect(counts.redCount).toBe(2)
      expect(counts.redKings).toBe(1)
      expect(counts.blackCount).toBe(3)
      expect(counts.blackKings).toBe(2)
    })

    it('should return zeros for empty board', () => {
      const board = createEmptyBoard()
      const counts = countPieces(board)

      expect(counts.redCount).toBe(0)
      expect(counts.blackCount).toBe(0)
      expect(counts.redKings).toBe(0)
      expect(counts.blackKings).toBe(0)
    })
  })

  describe('checkGameOver', () => {
    it('should not be over at initial position', () => {
      const board = createInitialBoard()
      const result = checkGameOver(board, 1)

      expect(result.isOver).toBe(false)
      expect(result.winner).toBeNull()
    })

    it('should declare winner when opponent has no pieces', () => {
      const board = createEmptyBoard()
      board[4][3] = { player: 1, type: 'regular' }
      // No player 2 pieces

      const result = checkGameOver(board, 1)

      expect(result.isOver).toBe(true)
      expect(result.winner).toBe(1)
    })

    it('should declare winner when current player has no moves', () => {
      const board = createEmptyBoard()
      // Player 1 piece in corner, blocked
      board[0][1] = { player: 1, type: 'regular' }
      // Cannot move forward (already at top)
      // Player 2 has pieces
      board[7][2] = { player: 2, type: 'regular' }

      const result = checkGameOver(board, 1)

      expect(result.isOver).toBe(true)
      expect(result.winner).toBe(2) // Player 1 has no moves, player 2 wins
    })

    it('should not be over when current player has moves', () => {
      const board = createEmptyBoard()
      board[5][2] = { player: 1, type: 'regular' }
      board[2][3] = { player: 2, type: 'regular' }

      const result = checkGameOver(board, 1)

      expect(result.isOver).toBe(false)
    })

    it('should handle player 2 having no pieces', () => {
      const board = createEmptyBoard()
      board[4][3] = { player: 1, type: 'king' }
      // No black pieces

      const result = checkGameOver(board, 2)

      expect(result.isOver).toBe(true)
      expect(result.winner).toBe(1)
    })

    it('should handle king having no valid moves (blocked)', () => {
      const board = createEmptyBoard()
      // King in corner blocked by own pieces
      board[7][0] = { player: 1, type: 'king' }
      board[6][1] = { player: 1, type: 'regular' }
      board[2][3] = { player: 2, type: 'regular' }

      // Check if player 1's only moves are from the regular piece
      const moves = getAllValidMoves(board, 1)
      // The king at 7,0 is blocked, but the piece at 6,1 can move
      expect(moves.length).toBeGreaterThan(0)

      const result = checkGameOver(board, 1)
      expect(result.isOver).toBe(false)
    })
  })

  describe('createInitialGameState', () => {
    it('should create state with correct defaults', () => {
      const state = createInitialGameState()

      expect(state.currentPlayer).toBe(1)
      expect(state.status).toBe('playing')
      expect(state.winner).toBeNull()
      expect(state.mode).toBe('pvc')
      expect(state.difficulty).toBe('medium')
      expect(state.moveHistory).toEqual([])
    })

    it('should set custom mode and difficulty', () => {
      const state = createInitialGameState('pvp', 'hard')

      expect(state.mode).toBe('pvp')
      expect(state.difficulty).toBe('hard')
    })

    it('should calculate initial piece counts', () => {
      const state = createInitialGameState()

      expect(state.redCount).toBe(12)
      expect(state.blackCount).toBe(12)
      expect(state.redKings).toBe(0)
      expect(state.blackKings).toBe(0)
    })

    it('should compute valid moves for player 1', () => {
      const state = createInitialGameState()

      expect(state.validMoves.length).toBeGreaterThan(0)
      // All valid moves should be for player 1
      state.validMoves.forEach(move => {
        const piece = state.board[move.from.row][move.from.col]
        expect(piece?.player).toBe(1)
      })
    })

    it('should set mustJump to false at initial position', () => {
      const state = createInitialGameState()

      // No jumps available at start
      expect(state.mustJump).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle corner positions correctly', () => {
      const board = createEmptyBoard()
      board[0][1] = { player: 1, type: 'king' }

      const moves = getValidMovesForPiece(board, { row: 0, col: 1 })

      // King at top can only move down
      expect(moves.every(m => m.to.row > 0)).toBe(true)
    })

    it('should handle a fully surrounded piece', () => {
      const board = createEmptyBoard()
      board[4][3] = { player: 1, type: 'regular' }
      board[3][2] = { player: 1, type: 'regular' }
      board[3][4] = { player: 1, type: 'regular' }

      const moves = getValidMovesForPiece(board, { row: 4, col: 3 })

      expect(moves.length).toBe(0)
    })

    it('should handle triple jump', () => {
      const board = createEmptyBoard()
      board[7][0] = { player: 1, type: 'regular' }
      board[6][1] = { player: 2, type: 'regular' }
      board[4][3] = { player: 2, type: 'regular' }
      board[2][5] = { player: 2, type: 'regular' }

      const moves = getValidMovesForPiece(board, { row: 7, col: 0 })

      // Should have a triple jump
      const tripleJump = moves.find(m => m.jumps.length === 3)
      expect(tripleJump).toBeDefined()
      expect(tripleJump!.to.row).toBe(1)
      expect(tripleJump!.to.col).toBe(6)
    })
  })

  describe('hashBoard', () => {
    it('should produce the same hash for the same board and same player', () => {
      const board = createInitialBoard()
      const hash1 = hashBoard(board, 1)
      const hash2 = hashBoard(board, 1)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for the same board but different player', () => {
      const board = createInitialBoard()
      const hash1 = hashBoard(board, 1)
      const hash2 = hashBoard(board, 2)

      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different boards', () => {
      const board1 = createInitialBoard()
      const board2 = createEmptyBoard()
      board2[4][3] = { player: 1, type: 'king' }

      const hash1 = hashBoard(board1, 1)
      const hash2 = hashBoard(board2, 1)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('40-move rule', () => {
    it('should return draw when counter reaches 40', () => {
      const board = createEmptyBoard()
      board[5][2] = { player: 1, type: 'king' }
      board[2][3] = { player: 2, type: 'king' }

      const result = checkGameOver(board, 1, 40)

      expect(result.isOver).toBe(true)
      expect(result.winner).toBeNull()
      expect(result.isDraw).toBe(true)
    })

    it('should return normal result when counter is less than 40', () => {
      const board = createEmptyBoard()
      board[5][2] = { player: 1, type: 'king' }
      board[2][3] = { player: 2, type: 'king' }

      const result = checkGameOver(board, 1, 39)

      expect(result.isOver).toBe(false)
      expect(result.winner).toBeNull()
      expect(result.isDraw).toBe(false)
    })

    it('should return draw when counter exceeds 40', () => {
      const board = createEmptyBoard()
      board[5][2] = { player: 1, type: 'king' }
      board[2][3] = { player: 2, type: 'king' }

      const result = checkGameOver(board, 1, 50)

      expect(result.isOver).toBe(true)
      expect(result.winner).toBeNull()
      expect(result.isDraw).toBe(true)
    })
  })

  describe('3-fold repetition', () => {
    it('should return draw when position appears 3 times in history', () => {
      const board = createEmptyBoard()
      board[5][2] = { player: 1, type: 'king' }
      board[2][3] = { player: 2, type: 'king' }

      const currentHash = hashBoard(board, 1)
      const positionHistory = [currentHash, 'other-position', currentHash, 'another-position', currentHash]

      const result = checkGameOver(board, 1, 0, positionHistory)

      expect(result.isOver).toBe(true)
      expect(result.winner).toBeNull()
      expect(result.isDraw).toBe(true)
    })

    it('should return normal result with fewer than 3 repetitions', () => {
      const board = createEmptyBoard()
      board[5][2] = { player: 1, type: 'king' }
      board[2][3] = { player: 2, type: 'king' }

      const currentHash = hashBoard(board, 1)
      const positionHistory = [currentHash, 'other-position', currentHash]

      const result = checkGameOver(board, 1, 0, positionHistory)

      expect(result.isOver).toBe(false)
      expect(result.winner).toBeNull()
      expect(result.isDraw).toBe(false)
    })

    it('should prioritize no-moves loss over draw by repetition', () => {
      const board = createEmptyBoard()
      // Player 1 piece at top row, cannot move forward (regular piece)
      board[0][1] = { player: 1, type: 'regular' }
      board[7][2] = { player: 2, type: 'regular' }

      const currentHash = hashBoard(board, 1)
      const positionHistory = [currentHash, currentHash, currentHash]

      const result = checkGameOver(board, 1, 50, positionHistory)

      // No-moves loss takes priority over draw rules
      expect(result.isOver).toBe(true)
      expect(result.winner).toBe(2)
      expect(result.isDraw).toBe(false)
    })
  })

  describe('createInitialGameState draw fields', () => {
    it('should initialize movesWithoutCaptureOrPromotion to 0', () => {
      const state = createInitialGameState()
      expect(state.movesWithoutCaptureOrPromotion).toBe(0)
    })

    it('should initialize positionHistory to empty array', () => {
      const state = createInitialGameState()
      expect(state.positionHistory).toEqual([])
    })
  })
})
