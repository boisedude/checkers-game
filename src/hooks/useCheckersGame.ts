/**
 * Checkers Game Hook
 *
 * Primary state management hook. Orchestrates game lifecycle, player and opponent
 * moves, undo, hints, and save/resume.
 *
 * Exports: useCheckersGame(initialDifficulty) -> game state + action callbacks.
 *
 * A move changes the game state at once; the board animates the new position by
 * itself (see Board). The hook only blocks input for as long as that animation
 * takes (moveAnimationMs), and the victory dialog waits for it.
 *
 * Undo in PvC mode undoes both player move + AI response (2 moves).
 *
 * The opponent's search and hints run in a web worker (aiClient). The opponent starts
 * thinking as soon as the player's move is on the board, while it animates. Its reply
 * lands once the player's animation has finished and at least MIN_REPLY_MS after the
 * player's move, so a fast search never answers instantly and a slow one adds no
 * delay of its own.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { GameState, Difficulty, Position, ValidMove, UndoState, GameMode, Move } from '@/types/checkers.types'
import {
  createInitialGameState,
  getValidMovesForPiece,
  computeNextGameState,
} from '@/lib/checkersRules'
import { saveGame, loadSavedGame, clearSavedGame, hasSavedGame } from '@/lib/gameSerialization'
import { requestAIMove } from '@/lib/aiClient'
import { HINT_TIME_MS } from '@/lib/aiStrategies'
import { MIN_REPLY_MS, moveAnimationMs } from '@/lib/animationConstants'

/** Promise-based delay that rejects on AbortSignal abort. */
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

  // Hint: the suggested move and the board it was computed for (it lapses when the board changes)
  const [hint, setHint] = useState<{ board: GameState['board']; move: ValidMove } | null>(null)
  const [hintPendingFor, setHintPendingFor] = useState<GameState['board'] | null>(null)
  const hintTokenRef = useRef(0)

  const aiMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiMoveScheduledRef = useRef(false)
  const aiAbortRef = useRef<AbortController | null>(null)
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** When the board finishes showing the last move. */
  const animationEndsAtRef = useRef(0)
  /** When the last move was made. */
  const lastMoveAtRef = useRef(0)

  /** Block input while the board shows this move, and no longer. */
  const playMoveAnimation = useCallback((move: Move) => {
    const ms = moveAnimationMs(move)
    const now = Date.now()
    lastMoveAtRef.current = now
    animationEndsAtRef.current = now + ms
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    animationTimerRef.current = null
    if (ms === 0) {
      setIsAnimating(false)
      return
    }
    setIsAnimating(true)
    animationTimerRef.current = setTimeout(() => {
      animationTimerRef.current = null
      setIsAnimating(false)
    }, ms)
  }, [])

  /**
   * Cancel the opponent's pending reply and any running animation
   */
  const cancelAnimations = useCallback(() => {
    if (aiAbortRef.current) {
      aiAbortRef.current.abort()
      aiAbortRef.current = null
    }
    if (aiMoveTimeoutRef.current) {
      clearTimeout(aiMoveTimeoutRef.current)
      aiMoveTimeoutRef.current = null
    }
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
    animationEndsAtRef.current = 0
    aiMoveScheduledRef.current = false
    setIsAnimating(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      aiAbortRef.current?.abort()
      if (aiMoveTimeoutRef.current) clearTimeout(aiMoveTimeoutRef.current)
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
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

  // The opponent's move when it is their turn (Player 2 = Black)
  useEffect(() => {
    if (
      gameState.currentPlayer === 2 &&
      gameState.status === 'playing' &&
      gameState.mode === 'pvc' &&
      !aiMoveScheduledRef.current
    ) {
      aiMoveScheduledRef.current = true
      const abortController = new AbortController()
      aiAbortRef.current = abortController
      const board = gameState.board
      const stateAtRequest = gameState

      aiMoveTimeoutRef.current = setTimeout(async () => {
        aiMoveTimeoutRef.current = null
        try {
          const aiMove = await requestAIMove(board, 2, stateAtRequest.difficulty, {
            positionHistory: stateAtRequest.positionHistory,
            movesWithoutCaptureOrPromotion: stateAtRequest.movesWithoutCaptureOrPromotion,
            plyCount: stateAtRequest.moveHistory.length,
          })
          if (abortController.signal.aborted || !aiMove) return

          // Land after the player's move has finished animating, and never instantly.
          const now = Date.now()
          const remaining = Math.max(
            MIN_REPLY_MS - (now - lastMoveAtRef.current),
            animationEndsAtRef.current - now
          )
          if (remaining > 0) await cancellableDelay(remaining, abortController.signal)

          let next: GameState
          try {
            next = computeNextGameState(stateAtRequest, aiMove)
          } catch (e) {
            console.warn('checkers: failed to apply AI move', e)
            return
          }
          let applied = false
          setGameState(prevState => {
            if (prevState.board !== board || prevState.currentPlayer !== 2 || prevState.status !== 'playing') {
              return prevState
            }
            applied = true
            return {
              ...next,
              // Preserve undo state so player can undo their move + AI response; clear on game over
              undoState: next.status !== 'playing' ? null : prevState.undoState,
            }
          })
          if (applied && next.lastMove) playMoveAnimation(next.lastMove)
        } catch (e) {
          // Ignore abort errors - they're expected when cancelling
          if (e instanceof DOMException && e.name === 'AbortError') return
          console.warn('checkers: opponent move failed', e)
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
  }, [gameState, playMoveAnimation])

  /**
   * Handles a tap or click on a square: selects one of the mover's men, or moves
   * the selected man to a marked square.
   */
  const handleSquareClick = useCallback(
    (row: number, col: number) => {
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

      if (!selectedPiece) return

      const validMove = getValidMovesForPiece(gameState.board, selectedPiece).find(
        m => m.to.row === row && m.to.col === col
      )
      setSelectedPiece(null)
      setHighlightedSquares([])
      if (!validMove) return

      let next: GameState
      try {
        next = computeNextGameState(gameState, validMove)
      } catch (e) {
        console.warn('checkers: failed to apply player move', e)
        return
      }
      // Save undo state so player can undo; clear on game over
      const undoState: UndoState = {
        board: gameState.board,
        currentPlayer: gameState.currentPlayer,
        lastMove: gameState.lastMove,
        redCount: gameState.redCount,
        blackCount: gameState.blackCount,
        redKings: gameState.redKings,
        blackKings: gameState.blackKings,
        validMoves: gameState.validMoves,
        mustJump: gameState.mustJump,
        movesWithoutCaptureOrPromotion: gameState.movesWithoutCaptureOrPromotion,
      }
      setHint(null)
      setGameState({ ...next, undoState: next.status !== 'playing' ? null : undoState })
      if (next.lastMove) playMoveAnimation(next.lastMove)
    },
    [gameState, selectedPiece, isAnimating, playMoveAnimation]
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
