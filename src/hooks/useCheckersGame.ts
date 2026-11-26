/**
 * Checkers Game Hook
 *
 * Primary state management hook. Orchestrates game lifecycle, player/AI moves,
 * animation sequencing, undo, and save/resume.
 *
 * Exports: useCheckersGame(initialDifficulty) -> game state + action callbacks.
 *
 * Animation flow: handleSquareClick/AI triggers executeAnimatedMove (async with
 * AbortController cancellation), then applies state via computeNextGameState.
 * Multi-jump animations update intermediateBoard for accurate visual state.
 *
 * Undo in PvC mode undoes both player move + AI response (2 moves).
 *
 * The opponent's search and hints run in a web worker (aiClient). The opponent starts
 * thinking as soon as the player commits a move, while that move animates; the reply
 * still waits out AI_MOVE_DELAY from the player's move and AI_MIN_PAUSE_AFTER_MOVE
 * after it lands, so it never arrives instantly.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { GameState, Difficulty, Position, ValidMove, UndoState, GameMode } from '@/types/checkers.types'
import {
  createInitialGameState,
  getValidMovesForPiece,
  computeNextGameState,
  hashBoard,
} from '@/lib/checkersRules'
import { saveGame, loadSavedGame, clearSavedGame, hasSavedGame } from '@/lib/gameSerialization'
import { requestAIMove } from '@/lib/aiClient'
import { HINT_TIME_MS } from '@/lib/aiStrategies'
import {
  AI_MOVE_DELAY,
  AI_MIN_PAUSE_AFTER_MOVE,
  MOVE_ANIMATION_DURATION,
  JUMP_ANIMATION_DURATION,
  CAPTURE_ANIMATION_DURATION,
  PROMOTION_ANIMATION_DURATION,
  POST_ANIMATION_SETTLE_DELAY,
} from '@/lib/animationConstants'

interface AnimatingPiece {
  from: Position
  to: Position
  isJump: boolean
}

/** Promise-based delay that rejects on AbortSignal abort. Used for animation sequencing. */
function cancellableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/** Creates a game state with status='setup' for the welcome screen. */
function createSetupState(mode: GameMode = 'pvc', difficulty: Difficulty = 'medium'): GameState {
  return {
    ...createInitialGameState(mode, difficulty),
    status: 'setup',
  }
}

export function useCheckersGame(initialDifficulty: Difficulty = 'medium') {
  const [gameState, setGameState] = useState<GameState>(() =>
    createSetupState('pvc', initialDifficulty)
  )
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [highlightedSquares, setHighlightedSquares] = useState<Position[]>([])

  // Animation state
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null)
  const [capturedPiece, setCapturedPiece] = useState<Position | null>(null)
  const [promotedPiece, setPromotedPiece] = useState<Position | null>(null)
  // Intermediate board for rendering during multi-jump animations
  const [intermediateBoard, setIntermediateBoard] = useState<GameState['board'] | null>(null)

  // Hint: the suggested move and the board it was computed for (it lapses when the board changes)
  const [hint, setHint] = useState<{ board: GameState['board']; move: ValidMove } | null>(null)
  const [hintPendingFor, setHintPendingFor] = useState<GameState['board'] | null>(null)
  const hintTokenRef = useRef(0)

  // The opponent's reply, asked for when the player commits a move (keyed by the position it answers)
  const prefetchRef = useRef<{
    key: string
    difficulty: Difficulty
    promise: Promise<ValidMove | null>
    askedAt: number
  } | null>(null)

  const aiMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiMoveScheduledRef = useRef(false)
  const animationAbortRef = useRef<AbortController | null>(null)

  /**
   * Cancel all in-flight animations and reset animation state
   */
  const cancelAnimations = useCallback(() => {
    if (animationAbortRef.current) {
      animationAbortRef.current.abort()
      animationAbortRef.current = null
    }
    if (aiMoveTimeoutRef.current) {
      clearTimeout(aiMoveTimeoutRef.current)
      aiMoveTimeoutRef.current = null
    }
    aiMoveScheduledRef.current = false
    prefetchRef.current = null
    setIsAnimating(false)
    setAnimatingPiece(null)
    setCapturedPiece(null)
    setPromotedPiece(null)
    setIntermediateBoard(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationAbortRef.current) {
        animationAbortRef.current.abort()
      }
      if (aiMoveTimeoutRef.current) {
        clearTimeout(aiMoveTimeoutRef.current)
      }
    }
  }, [])

  // Auto-save game state when playing
  useEffect(() => {
    if (gameState.status === 'playing') {
      saveGame(gameState)
    } else if (gameState.status === 'won' || gameState.status === 'draw') {
      clearSavedGame()
    }
  }, [gameState])

  /**
   * Execute a move with full animation sequence
   */
  const executeAnimatedMove = useCallback(
    async (
      move: ValidMove,
      player: 1 | 2,
      prevBoard: GameState['board'],
      signal: AbortSignal
    ): Promise<void> => {
      const isJump = move.jumps.length > 0
      const animationDuration = isJump ? JUMP_ANIMATION_DURATION : MOVE_ANIMATION_DURATION

      // For multi-jump moves, animate each jump sequentially with incremental board updates
      if (move.jumps.length > 1) {
        let currentFrom = move.from
        let currentBoard = prevBoard.map(row => [...row])

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
          await cancellableDelay(JUMP_ANIMATION_DURATION, signal)

          // Update board incrementally: move piece, remove captured piece
          const nextBoard = currentBoard.map(row => [...row])
          nextBoard[jump.to.row][jump.to.col] = nextBoard[currentFrom.row][currentFrom.col]
          nextBoard[currentFrom.row][currentFrom.col] = null
          nextBoard[jump.captured.row][jump.captured.col] = null
          currentBoard = nextBoard

          // Show intermediate board state so the piece is visually in the right position
          setIntermediateBoard(currentBoard)

          // Clear capture animation
          setCapturedPiece(null)

          // Wait a bit for capture to fade
          await cancellableDelay(CAPTURE_ANIMATION_DURATION / 2, signal)

          currentFrom = jump.to
        }

        setAnimatingPiece(null)
        setIntermediateBoard(null)
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
        await cancellableDelay(animationDuration, signal)

        if (isJump) {
          // Wait for capture animation
          await cancellableDelay(CAPTURE_ANIMATION_DURATION / 2, signal)
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
        await cancellableDelay(PROMOTION_ANIMATION_DURATION, signal)
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
      const abortController = new AbortController()
      animationAbortRef.current = abortController

      aiMoveTimeoutRef.current = setTimeout(async () => {
        aiMoveTimeoutRef.current = null
        const turnStartedAt = Date.now()
        const pre = prefetchRef.current
        prefetchRef.current = null
        const key = `${hashBoard(gameState.board, 2)}:${gameState.moveHistory.length}`
        const prefetched = pre && pre.key === key && pre.difficulty === gameState.difficulty ? pre : null
        const askedAt = prefetched ? prefetched.askedAt : turnStartedAt
        try {
          const aiMove = await (prefetched
            ? prefetched.promise
            : requestAIMove(gameState.board, 2, gameState.difficulty, {
                positionHistory: gameState.positionHistory,
                movesWithoutCaptureOrPromotion: gameState.movesWithoutCaptureOrPromotion,
                plyCount: gameState.moveHistory.length,
              }))
          if (abortController.signal.aborted) return

          // Keep a minimum thinking pause so the reply never lands instantly
          const remaining = Math.max(
            AI_MOVE_DELAY - (Date.now() - askedAt),
            AI_MIN_PAUSE_AFTER_MOVE - (Date.now() - turnStartedAt)
          )
          if (remaining > 0) await cancellableDelay(remaining, abortController.signal)

          if (aiMove) {
            setIsAnimating(true)

            // Run animation sequence
            await executeAnimatedMove(aiMove, 2, gameState.board, abortController.signal)

            // Brief settle delay so player sees the final position
            await cancellableDelay(POST_ANIMATION_SETTLE_DELAY, abortController.signal)

            // Apply move to state
            setGameState(prevState => {
              if (prevState.currentPlayer !== 2 || prevState.status !== 'playing') return prevState
              try {
                const nextState = computeNextGameState(prevState, aiMove)
                return {
                  ...nextState,
                  // Preserve undo state so player can undo their move + AI response; clear on game over
                  undoState: nextState.status !== 'playing' ? null : prevState.undoState,
                }
              } catch (e) {
                console.warn('checkers: failed to apply AI move', e)
                return prevState
              }
            })

            setIsAnimating(false)
          }
        } catch (e) {
          // Ignore abort errors - they're expected when cancelling animations
          if (e instanceof DOMException && e.name === 'AbortError') return
          setIsAnimating(false)
        } finally {
          // A cancelled request must not clear the flag of a request scheduled after it
          if (!abortController.signal.aborted) aiMoveScheduledRef.current = false
        }
      }, 0)
    }

    return () => {
      // The move has not started yet: unschedule it so the next run can reschedule.
      if (aiMoveTimeoutRef.current) {
        clearTimeout(aiMoveTimeoutRef.current)
        aiMoveTimeoutRef.current = null
        aiMoveScheduledRef.current = false
      }
    }
  }, [
    gameState.currentPlayer,
    gameState.status,
    gameState.mode,
    gameState.board,
    gameState.difficulty,
    gameState.positionHistory,
    gameState.movesWithoutCaptureOrPromotion,
    gameState.moveHistory.length,
    isAnimating,
    executeAnimatedMove,
  ])

  /**
   * Handles clicking on a square
   */
  const handleSquareClick = useCallback(
    async (row: number, col: number) => {
      if (isAnimating || gameState.status !== 'playing') return

      // In PvC mode, only allow player 1 to click
      if (gameState.mode === 'pvc' && gameState.currentPlayer !== 1) return

      const piece = gameState.board[row][col]

      // If clicking on current player's piece, select it
      if (piece && piece.player === gameState.currentPlayer) {
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
          const abortController = new AbortController()
          animationAbortRef.current = abortController
          setIsAnimating(true)
          setSelectedPiece(null)
          setHighlightedSquares([])
          setHint(null)

          // Let the opponent start thinking while this move animates
          if (gameState.mode === 'pvc') {
            try {
              const next = computeNextGameState(gameState, validMove)
              if (next.status === 'playing' && next.currentPlayer === 2) {
                const promise = requestAIMove(next.board, 2, next.difficulty, {
                  positionHistory: next.positionHistory,
                  movesWithoutCaptureOrPromotion: next.movesWithoutCaptureOrPromotion,
                  plyCount: next.moveHistory.length,
                })
                promise.catch(() => {})
                prefetchRef.current = {
                  key: `${hashBoard(next.board, 2)}:${next.moveHistory.length}`,
                  difficulty: next.difficulty,
                  promise,
                  askedAt: Date.now(),
                }
              }
            } catch {
              prefetchRef.current = null
            }
          }

          try {
            // Run animation sequence
            await executeAnimatedMove(validMove, gameState.currentPlayer, gameState.board, abortController.signal)

            // Apply move to state
            setGameState(prevState => {
              try {
                const nextState = computeNextGameState(prevState, validMove)

                // Save undo state so player can undo; clear on game over
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
                  movesWithoutCaptureOrPromotion: prevState.movesWithoutCaptureOrPromotion,
                }

                return {
                  ...nextState,
                  undoState: nextState.status !== 'playing' ? null : undoState,
                }
              } catch (e) {
                console.warn('checkers: failed to apply player move', e)
                return prevState
              }
            })

            setIsAnimating(false)
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return
            setIsAnimating(false)
          }
        } else {
          // Clicked on invalid square, deselect
          setSelectedPiece(null)
          setHighlightedSquares([])
        }
      }
    },
    [
      gameState,
      selectedPiece,
      isAnimating,
      executeAnimatedMove,
    ]
  )

  /**
   * Starts a new game (from gameplay, resets to playing)
   */
  const startNewGame = useCallback(() => {
    cancelAnimations()
    setGameState(createInitialGameState(gameState.mode, gameState.difficulty))
    setSelectedPiece(null)
    setHighlightedSquares([])
  }, [gameState.difficulty, gameState.mode, cancelAnimations])

  /**
   * Start game from the welcome/setup screen
   */
  const startGame = useCallback((mode: GameMode, difficulty: Difficulty) => {
    cancelAnimations()
    setGameState(createInitialGameState(mode, difficulty))
    setSelectedPiece(null)
    setHighlightedSquares([])
  }, [cancelAnimations])

  /**
   * Returns to the setup/welcome screen
   */
  const returnToSetup = useCallback(() => {
    cancelAnimations()
    setGameState(prevState => createSetupState(prevState.mode, prevState.difficulty))
    setSelectedPiece(null)
    setHighlightedSquares([])
  }, [cancelAnimations])

  /**
   * Resume a saved game from localStorage
   */
  const resumeGame = useCallback(() => {
    const saved = loadSavedGame()
    if (saved && saved.status === 'playing') {
      cancelAnimations()
      setGameState(saved)
      setSelectedPiece(null)
      setHighlightedSquares([])
    }
  }, [cancelAnimations])

  /**
   * Changes difficulty level
   */
  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    // The opponent is fixed once a game has begun; the page starts a new game instead.
    setGameState(prevState =>
      prevState.status === 'playing' && prevState.moveHistory.length > 0
        ? prevState
        : { ...prevState, difficulty: newDifficulty }
    )
  }, [])

  /**
   * Changes game mode
   */
  const changeMode = useCallback((newMode: GameMode) => {
    setGameState(prevState => ({
      ...prevState,
      mode: newMode,
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

    cancelAnimations()

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
        positionHistory: prevState.positionHistory.slice(0, -movesToRemove),
        movesWithoutCaptureOrPromotion:
          undoState.movesWithoutCaptureOrPromotion ?? prevState.movesWithoutCaptureOrPromotion,
        undoState: null, // Clear undo state after using it (one undo per player move)
      }
    })

    // Clear any selection state
    setSelectedPiece(null)
    setHighlightedSquares([])
  }, [isAnimating, cancelAnimations])

  /**
   * Asks Bentley's engine for the best move for the human (games against a character only).
   */
  const canRequestHint =
    gameState.mode === 'pvc' &&
    gameState.status === 'playing' &&
    gameState.currentPlayer === 1 &&
    !isAnimating

  const requestHint = useCallback(async () => {
    if (!canRequestHint) return
    const board = gameState.board
    const token = ++hintTokenRef.current
    setHintPendingFor(board)
    try {
      const move = await requestAIMove(board, 1, 'hard', {
        positionHistory: gameState.positionHistory,
        movesWithoutCaptureOrPromotion: gameState.movesWithoutCaptureOrPromotion,
        timeMs: HINT_TIME_MS,
      })
      if (token === hintTokenRef.current && move) setHint({ board, move })
    } catch (e) {
      console.warn('checkers: hint failed', e)
    } finally {
      if (token === hintTokenRef.current) setHintPendingFor(null)
    }
  }, [canRequestHint, gameState.board, gameState.positionHistory, gameState.movesWithoutCaptureOrPromotion])

  // A hint belongs to the board it was computed for; any move, undo or new game retires it.
  const hintMove = hint && hint.board === gameState.board && canRequestHint ? hint.move : null
  const hintPending = hintPendingFor !== null && hintPendingFor === gameState.board

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

  // Determine if undo is available
  const canUndo =
    gameState.undoState !== null &&
    gameState.status === 'playing' &&
    !isAnimating &&
    // In PvC mode, only allow undo on player's turn; in PvP, allow on either turn
    (gameState.mode === 'pvp' || gameState.currentPlayer === 1)

  return {
    gameState,
    selectedPiece,
    isAnimating,
    highlightedSquares,
    animatingPiece,
    capturedPiece,
    promotedPiece,
    intermediateBoard,
    handleSquareClick,
    startNewGame,
    startGame,
    returnToSetup,
    resumeGame,
    changeDifficulty,
    changeMode,
    undoMove,
    isHighlighted,
    isPieceSelected,
    canUndo,
    hasSavedGame,
    hintMove,
    hintPending,
    canRequestHint,
    requestHint,
  }
}
