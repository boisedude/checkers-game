/**
 * Checkers Game Hook
 * Main game state management with piece movement and capture animations
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { GameState, Difficulty, Position, ValidMove, UndoState } from '@/types/checkers.types'
import {
  createInitialGameState,
  getAllValidMoves,
  getValidMovesForPiece,
  applyMove,
  checkGameOver,
  countPieces,
} from '@/lib/checkersRules'
import { getAIMove } from '@/lib/aiStrategies'
import {
  AI_MOVE_DELAY,
  MOVE_ANIMATION_DURATION,
  JUMP_ANIMATION_DURATION,
  CAPTURE_ANIMATION_DURATION,
  PROMOTION_ANIMATION_DURATION,
} from '@/lib/animationConstants'

interface AnimatingPiece {
  from: Position
  to: Position
  isJump: boolean
}

export function useCheckersGame(initialDifficulty: Difficulty = 'medium') {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState('pvc', initialDifficulty)
  )
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [highlightedSquares, setHighlightedSquares] = useState<Position[]>([])

  // Animation state
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null)
  const [capturedPiece, setCapturedPiece] = useState<Position | null>(null)
  const [promotedPiece, setPromotedPiece] = useState<Position | null>(null)

  const aiMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiMoveScheduledRef = useRef(false)

  // Cleanup AI move timeout on unmount
  useEffect(() => {
    return () => {
      if (aiMoveTimeoutRef.current) {
        clearTimeout(aiMoveTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Execute a move with full animation sequence
   */
  const executeAnimatedMove = useCallback(
    async (
      move: ValidMove,
      player: 1 | 2,
      prevBoard: GameState['board']
    ): Promise<void> => {
      const isJump = move.jumps.length > 0
      const animationDuration = isJump ? JUMP_ANIMATION_DURATION : MOVE_ANIMATION_DURATION

      // For multi-jump moves, we animate each jump sequentially
      if (move.jumps.length > 1) {
        // Multi-jump chain animation
        let currentFrom = move.from

        for (let i = 0; i < move.jumps.length; i++) {
          const jump = move.jumps[i]

          // Set animating piece for this jump
          setAnimatingPiece({
            from: currentFrom,
            to: jump.to,
            isJump: true,
          })

          // Set captured piece
          setCapturedPiece(jump.captured)

          // Wait for jump animation
          await new Promise(resolve => setTimeout(resolve, JUMP_ANIMATION_DURATION))

          // Clear capture animation
          setCapturedPiece(null)

          // Wait a bit for capture to fade
          await new Promise(resolve => setTimeout(resolve, CAPTURE_ANIMATION_DURATION / 2))

          currentFrom = jump.to
        }

        setAnimatingPiece(null)
      } else {
        // Single move or single jump
        setAnimatingPiece({
          from: move.from,
          to: move.to,
          isJump,
        })

        if (isJump && move.jumps[0]) {
          setCapturedPiece(move.jumps[0].captured)
        }

        // Wait for move animation
        await new Promise(resolve => setTimeout(resolve, animationDuration))

        if (isJump) {
          // Wait for capture animation
          await new Promise(resolve => setTimeout(resolve, CAPTURE_ANIMATION_DURATION / 2))
          setCapturedPiece(null)
        }

        setAnimatingPiece(null)
      }

      // Check if piece will be promoted
      const pieceBeforeMove = prevBoard[move.from.row][move.from.col]
      const willBeKing =
        pieceBeforeMove?.type === 'regular' &&
        ((player === 1 && move.to.row === 0) || (player === 2 && move.to.row === 7))

      if (willBeKing) {
        setPromotedPiece(move.to)
        await new Promise(resolve => setTimeout(resolve, PROMOTION_ANIMATION_DURATION))
        setPromotedPiece(null)
      }
    },
    []
  )

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

      aiMoveTimeoutRef.current = setTimeout(async () => {
        try {
          const aiMove = getAIMove(gameState.board, 2, gameState.difficulty)

          if (aiMove) {
            setIsAnimating(true)

            // Run animation sequence
            await executeAnimatedMove(aiMove, 2, gameState.board)

            // Apply move to state
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
                  becameKing: false,
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
                  // Clear undo state on game over, otherwise preserve it
                  // so player can undo both their move and AI's response
                  undoState: gameOver.isOver ? null : prevState.undoState,
                }
              } catch {
                return prevState
              }
            })

            setIsAnimating(false)
          }
        } catch {
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
    executeAnimatedMove,
  ])

  /**
   * Handles clicking on a square
   */
  const handleSquareClick = useCallback(
    async (row: number, col: number) => {
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
          // Execute the move with animation
          setIsAnimating(true)
          const savedSelectedPiece = { ...selectedPiece }
          setSelectedPiece(null)
          setHighlightedSquares([])

          // Run animation sequence
          await executeAnimatedMove(validMove, 1, gameState.board)

          // Apply move to state
          setGameState(prevState => {
            try {
              const newBoard = applyMove(prevState.board, validMove)
              const counts = countPieces(newBoard)
              const nextPlayer = prevState.currentPlayer === 1 ? 2 : 1
              const gameOver = checkGameOver(newBoard, nextPlayer)
              const validMoves = gameOver.isOver ? [] : getAllValidMoves(newBoard, nextPlayer)

              // Check if piece became king
              const pieceAfterMove = newBoard[validMove.to.row][validMove.to.col]
              const pieceBefore = prevState.board[savedSelectedPiece.row][savedSelectedPiece.col]
              const becameKing =
                pieceAfterMove?.type === 'king' && pieceBefore?.type === 'regular'

              const move = {
                from: validMove.from,
                to: validMove.to,
                jumps: validMove.jumps,
                player: prevState.currentPlayer,
                becameKing,
              }

              // Save undo state before applying the move (player 1's move)
              const undoState: UndoState = {
                board: prevState.board,
                currentPlayer: prevState.currentPlayer,
                lastMove: prevState.lastMove,
                redCount: prevState.redCount,
                blackCount: prevState.blackCount,
                redKings: prevState.redKings,
                blackKings: prevState.blackKings,
                validMoves: prevState.validMoves,
                mustJump: prevState.mustJump,
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
                // Only save undo state if game is not over (can't undo after game ends)
                undoState: gameOver.isOver ? null : undoState,
              }
            } catch {
              return prevState
            }
          })

          setIsAnimating(false)
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
      executeAnimatedMove,
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
    setAnimatingPiece(null)
    setCapturedPiece(null)
    setPromotedPiece(null)
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
   * Undo the last move(s)
   * In VS AI mode: Undoes both player's move and AI's response
   * In PvP mode: Undoes the last single move
   */
  const undoMove = useCallback(() => {
    // Don't allow undo during animations
    if (isAnimating) return

    setGameState(prevState => {
      // Check if undo is available
      if (!prevState.undoState) return prevState
      if (prevState.status !== 'playing') return prevState

      // In VS AI mode, only allow undo when it's player's turn
      // (after AI has responded to player's move)
      if (prevState.mode === 'pvc' && prevState.currentPlayer !== 1) return prevState

      const { undoState } = prevState

      // Remove the moves from history
      // In VS AI mode, remove both player's and AI's moves (last 2 moves)
      // In PvP mode, remove just the last move
      const movesToRemove = prevState.mode === 'pvc' ? 2 : 1
      const newMoveHistory = prevState.moveHistory.slice(0, -movesToRemove)
      const newLastMove = newMoveHistory.length > 0
        ? newMoveHistory[newMoveHistory.length - 1]
        : undefined

      return {
        ...prevState,
        board: undoState.board,
        currentPlayer: undoState.currentPlayer,
        lastMove: newLastMove,
        redCount: undoState.redCount,
        blackCount: undoState.blackCount,
        redKings: undoState.redKings,
        blackKings: undoState.blackKings,
        validMoves: undoState.validMoves,
        mustJump: undoState.mustJump,
        moveHistory: newMoveHistory,
        undoState: null, // Clear undo state after using it (one undo per player move)
      }
    })

    // Clear any selection state
    setSelectedPiece(null)
    setHighlightedSquares([])
  }, [isAnimating])

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
    animatingPiece,
    capturedPiece,
    promotedPiece,
    handleSquareClick,
    startNewGame,
    changeDifficulty,
    undoMove,
    isHighlighted,
    isPieceSelected,
  }
}
