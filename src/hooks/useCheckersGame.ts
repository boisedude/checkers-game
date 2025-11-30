/**
 * Checkers Game Hook
 * Main game state management with piece movement and capture animations
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { GameState, Difficulty, Position } from '@/types/checkers.types'
import {
  createInitialGameState,
  getAllValidMoves,
  getValidMovesForPiece,
  applyMove,
  checkGameOver,
  countPieces,
} from '@/lib/checkersRules'
import { getAIMove } from '@/lib/aiStrategies'

const AI_MOVE_DELAY = 600 // ms
const MOVE_ANIMATION_DELAY = 200 // ms

export function useCheckersGame(initialDifficulty: Difficulty = 'medium') {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState('pvc', initialDifficulty)
  )
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [highlightedSquares, setHighlightedSquares] = useState<Position[]>([])

  const aiMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiMoveScheduledRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (aiMoveTimeoutRef.current) {
        clearTimeout(aiMoveTimeoutRef.current)
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  // Handle AI move when it's AI's turn (Player 2 = Black)
  useEffect(() => {
    if (
      gameState.currentPlayer === 2 &&
      gameState.status === 'playing' &&
      gameState.mode === 'pvc' &&
      !isAnimating &&
      !aiMoveScheduledRef.current
    ) {
      aiMoveScheduledRef.current = true

      aiMoveTimeoutRef.current = setTimeout(() => {
        try {
          const aiMove = getAIMove(gameState.board, 2, gameState.difficulty)

          if (aiMove) {
            setIsAnimating(true)

            animationTimeoutRef.current = setTimeout(() => {
              setGameState(prevState => {
                try {
                  const newBoard = applyMove(prevState.board, aiMove)
                  const counts = countPieces(newBoard)
                  const nextPlayer = prevState.currentPlayer === 1 ? 2 : 1
                  const gameOver = checkGameOver(newBoard, nextPlayer)
                  const validMoves = gameOver.isOver ? [] : getAllValidMoves(newBoard, nextPlayer)

                  const move = {
                    from: aiMove.from,
                    to: aiMove.to,
                    jumps: aiMove.jumps,
                    player: prevState.currentPlayer,
                    becameKing: false, // We'll detect this from board state if needed
                  }

                  return {
                    ...prevState,
                    board: newBoard,
                    currentPlayer: nextPlayer,
                    status: gameOver.isOver ? (gameOver.isDraw ? 'draw' : 'won') : 'playing',
                    winner: gameOver.winner,
                    moveHistory: [...prevState.moveHistory, move],
                    lastMove: move,
                    ...counts,
                    validMoves,
                    mustJump: validMoves.some(m => m.jumps.length > 0),
                  }
                } catch (error) {
                  console.error('AI move execution failed:', error)
                  return prevState
                }
              })
              setIsAnimating(false)
              animationTimeoutRef.current = null
            }, MOVE_ANIMATION_DELAY)
          }
        } catch (error) {
          console.error('AI move failed:', error)
          setIsAnimating(false)
        } finally {
          aiMoveScheduledRef.current = false
        }
      }, AI_MOVE_DELAY)
    }

    return () => {
      if (aiMoveTimeoutRef.current) {
        clearTimeout(aiMoveTimeoutRef.current)
        aiMoveTimeoutRef.current = null
      }
    }
  }, [
    gameState.currentPlayer,
    gameState.status,
    gameState.mode,
    gameState.board,
    gameState.difficulty,
    isAnimating,
  ])

  /**
   * Handles clicking on a square
   */
  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (isAnimating || gameState.status !== 'playing' || gameState.currentPlayer !== 1) {
        return
      }

      const piece = gameState.board[row][col]

      // If clicking on own piece, select it
      if (piece && piece.player === 1) {
        const validMoves = getValidMovesForPiece(gameState.board, { row, col })

        // Only allow selecting this piece if it has valid moves
        // And if no jumps are forced OR this piece can jump
        if (validMoves.length > 0) {
          const canJump = validMoves.some(m => m.jumps.length > 0)

          if (!gameState.mustJump || canJump) {
            setSelectedPiece({ row, col })
            setHighlightedSquares(validMoves.map(m => m.to))
            return
          }
        }
      }

      // If a piece is selected and clicking on a valid destination
      if (selectedPiece) {
        const validMovesForSelected = getValidMovesForPiece(gameState.board, selectedPiece)
        const validMove = validMovesForSelected.find(
          m => m.to.row === row && m.to.col === col
        )

        if (validMove) {
          // Execute the move
          setIsAnimating(true)
          setSelectedPiece(null)
          setHighlightedSquares([])

          animationTimeoutRef.current = setTimeout(() => {
            setGameState(prevState => {
              try {
                const newBoard = applyMove(prevState.board, validMove)
                const counts = countPieces(newBoard)
                const nextPlayer = prevState.currentPlayer === 1 ? 2 : 1
                const gameOver = checkGameOver(newBoard, nextPlayer)
                const validMoves = gameOver.isOver ? [] : getAllValidMoves(newBoard, nextPlayer)

                // Check if piece became king
                const pieceAfterMove = newBoard[validMove.to.row][validMove.to.col]
                const pieceBefore = prevState.board[selectedPiece.row][selectedPiece.col]
                const becameKing =
                  pieceAfterMove?.type === 'king' && pieceBefore?.type === 'regular'

                const move = {
                  from: validMove.from,
                  to: validMove.to,
                  jumps: validMove.jumps,
                  player: prevState.currentPlayer,
                  becameKing,
                }

                return {
                  ...prevState,
                  board: newBoard,
                  currentPlayer: nextPlayer,
                  status: gameOver.isOver ? (gameOver.isDraw ? 'draw' : 'won') : 'playing',
                  winner: gameOver.winner,
                  moveHistory: [...prevState.moveHistory, move],
                  lastMove: move,
                  ...counts,
                  validMoves,
                  mustJump: validMoves.some(m => m.jumps.length > 0),
                }
              } catch (error) {
                console.error('Move execution failed:', error)
                return prevState
              }
            })
            setIsAnimating(false)
            animationTimeoutRef.current = null
          }, MOVE_ANIMATION_DELAY)
        } else {
          // Clicked on invalid square, deselect
          setSelectedPiece(null)
          setHighlightedSquares([])
        }
      }
    },
    [
      gameState.board,
      gameState.status,
      gameState.currentPlayer,
      gameState.mustJump,
      selectedPiece,
      isAnimating,
    ]
  )

  /**
   * Starts a new game
   */
  const startNewGame = useCallback(() => {
    setGameState(createInitialGameState('pvc', gameState.difficulty))
    setSelectedPiece(null)
    setHighlightedSquares([])
    setIsAnimating(false)
  }, [gameState.difficulty])

  /**
   * Changes difficulty level
   */
  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    setGameState(prevState => ({
      ...prevState,
      difficulty: newDifficulty,
    }))
  }, [])

  /**
   * Checks if a square is highlighted (valid move destination)
   */
  const isHighlighted = useCallback(
    (row: number, col: number): boolean => {
      return highlightedSquares.some(sq => sq.row === row && sq.col === col)
    },
    [highlightedSquares]
  )

  /**
   * Checks if a piece is selected
   */
  const isPieceSelected = useCallback(
    (row: number, col: number): boolean => {
      return selectedPiece !== null && selectedPiece.row === row && selectedPiece.col === col
    },
    [selectedPiece]
  )

  return {
    gameState,
    selectedPiece,
    isAnimating,
    highlightedSquares,
    handleSquareClick,
    startNewGame,
    changeDifficulty,
    isHighlighted,
    isPieceSelected,
  }
}
