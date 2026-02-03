/**
 * Checkers Game Page
 * Main game interface for Checkers
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Board } from '@/components/Board'
import { GameControls } from '@/components/GameControls'
import { VictoryDialog } from '@/components/VictoryDialog'
import { LeaderboardDialog } from '@/components/LeaderboardDialog'
import { Tutorial } from '@/components/Tutorial'
import { Button } from '@/components/ui/button'
import { useCheckersGame } from '@/hooks/useCheckersGame'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useGameAudio } from '@/hooks/useGameAudio'
import { useCharacterSelection } from '@/hooks/useCharacterSelection'
import { useBentleyStats } from '@/hooks/useBentleyStats'
import { useMainSiteBentleyStats } from '@/hooks/useMainSiteBentleyStats'
import { STORAGE_KEYS } from '@/lib/storageKeys'

/** Delay before showing tutorial on first visit (ms) */
const TUTORIAL_SHOW_DELAY_MS = 500

export function CheckersGame() {
  const {
    gameState,
    isAnimating,
    animatingPiece,
    capturedPiece,
    promotedPiece,
    handleSquareClick,
    startNewGame,
    changeDifficulty,
    undoMove,
    isHighlighted,
    isPieceSelected,
  } = useCheckersGame()

  const { character, changeCharacter } = useCharacterSelection(gameState.difficulty)
  const { recordBentleyWin: recordLocalBentleyWin, recordBentleyLoss: recordLocalBentleyLoss, recordBentleyDraw } = useBentleyStats()
  const mainSiteBentleyStats = useMainSiteBentleyStats()
  const { stats, recordWin, recordLoss, recordDraw, updatePlayerName, resetStats } = useLeaderboard()
  const { playDiscPlace, playVictory, playDefeat, playDraw } = useGameAudio()

  const [victoryDialogDismissed, setVictoryDialogDismissed] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TUTORIAL_COMPLETED) === 'true'
    } catch {
      return false
    }
  })
  const prevStatusRef = useRef(gameState.status)
  const gameEndHandledRef = useRef(false)

  // Show tutorial on first visit
  useEffect(() => {
    if (!hasCompletedTutorial) {
      const timer = setTimeout(() => {
        setShowTutorial(true)
      }, TUTORIAL_SHOW_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedTutorial])

  // Handle tutorial completion
  const handleTutorialComplete = useCallback(() => {
    setHasCompletedTutorial(true)
    try {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_COMPLETED, 'true')
    } catch {
      // localStorage may be unavailable or full - tutorial will show again on next visit
    }
  }, [])

  // Derive whether to show victory dialog from game state
  // Dialog shows when game ends and hasn't been dismissed
  const showVictoryDialog = gameState.status !== 'playing' && !victoryDialogDismissed

  // Handle game end side effects (sounds, stats recording)
  useEffect(() => {
    const prevStatus = prevStatusRef.current

    if (prevStatus === 'playing' && gameState.status !== 'playing' && !gameEndHandledRef.current) {
      gameEndHandledRef.current = true

      // Calculate stats
      const totalCaptures = gameState.moveHistory.reduce(
        (acc, move) => acc + move.jumps.length,
        0
      )

      // Calculate margin
      const margin = Math.abs(gameState.redCount - gameState.blackCount)

      // Perfect game check
      const isPerfect =
        (gameState.winner === 1 && gameState.blackCount === 0) ||
        (gameState.winner === 2 && gameState.redCount === 0)

      if (gameState.status === 'won') {
        if (gameState.winner === 1) {
          // Player wins
          playVictory()
          recordWin(margin, totalCaptures, isPerfect)

          // Track Bentley stats if playing on hard
          if (gameState.difficulty === 'hard') {
            recordLocalBentleyWin(margin, totalCaptures, isPerfect)
            mainSiteBentleyStats.recordBentleyLoss()
          }
        } else if (gameState.winner === 2) {
          // AI wins
          playDefeat()
          recordLoss(totalCaptures)

          // Track Bentley stats if playing on hard
          if (gameState.difficulty === 'hard') {
            recordLocalBentleyLoss(margin, totalCaptures)
            mainSiteBentleyStats.recordBentleyWin()
          }
        }
      } else if (gameState.status === 'draw') {
        playDraw()
        recordDraw(totalCaptures)

        // Track Bentley stats if playing on hard
        if (gameState.difficulty === 'hard') {
          recordBentleyDraw(totalCaptures)
        }
      }
    }

    prevStatusRef.current = gameState.status
  }, [gameState.status, gameState.winner, gameState.difficulty, gameState.redCount, gameState.blackCount, gameState.moveHistory, playVictory, playDefeat, playDraw, recordWin, recordLoss, recordDraw, recordLocalBentleyWin, recordLocalBentleyLoss, recordBentleyDraw, mainSiteBentleyStats])

  // Play sound when moves are made
  useEffect(() => {
    if (gameState.lastMove) {
      playDiscPlace()
    }
  }, [gameState.lastMove, playDiscPlace])

  const handleNewGame = useCallback(() => {
    setVictoryDialogDismissed(false)
    gameEndHandledRef.current = false
    startNewGame()
  }, [startNewGame])

  const handleDifficultyChange = useCallback(
    (difficulty: 'easy' | 'medium' | 'hard') => {
      changeDifficulty(difficulty)
      changeCharacter(difficulty)
    },
    [changeDifficulty, changeCharacter]
  )

  // Determine if undo is available
  // In VS AI mode: can undo when it's player's turn and there's an undo state
  // Don't allow undo during animations or AI thinking
  const canUndo =
    gameState.undoState !== null &&
    gameState.status === 'playing' &&
    gameState.currentPlayer === 1 &&
    !isAnimating

  // Keyboard shortcut for undo (U key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Handle U key for undo
      if ((event.key === 'u' || event.key === 'U') && canUndo) {
        event.preventDefault()
        undoMove()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, undoMove])

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-br from-gray-100 to-gray-200 p-2 sm:p-4 sm:justify-center">
      {/* Return to Arcade Button */}
      <div className="w-full max-w-2xl mb-3 sm:mb-4">
        <a href="https://www.mcooper.com/arcade/" className="block">
          <Button
            variant="outline"
            className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base font-semibold border-2 hover:bg-gray-100 hover:border-gray-400"
          >
            ← Return to Arcade
          </Button>
        </a>
      </div>

      {/* Character Info */}
      <div className="mb-3 sm:mb-6 flex items-center gap-3 sm:gap-4 rounded-lg bg-white p-3 sm:p-4 shadow-lg w-full max-w-md" role="region" aria-label="Current opponent">
        <img
          src={character.avatar}
          alt={`${character.name} avatar`}
          className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-2 border-amber-500"
        />
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">
            {character.name} {character.emoji}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">{character.playingStyle}</p>
        </div>
      </div>

      {/* Game Info */}
      <div className="mb-3 sm:mb-6 flex gap-4 sm:gap-8 rounded-lg bg-white p-3 sm:p-4 shadow-lg w-full max-w-md" role="region" aria-label="Piece count">
        <div className="text-center flex-1">
          <div className="text-xl sm:text-2xl font-bold text-red-600">{gameState.redCount}</div>
          <div className="text-xs sm:text-sm text-gray-600">Your Pieces</div>
          {gameState.redKings > 0 && (
            <div className="text-xs text-yellow-600">({gameState.redKings} ♛)</div>
          )}
        </div>
        <div className="border-l border-gray-300" />
        <div className="text-center flex-1">
          <div className="text-xl sm:text-2xl font-bold text-gray-800">{gameState.blackCount}</div>
          <div className="text-xs sm:text-sm text-gray-600">{character.name}'s Pieces</div>
          {gameState.blackKings > 0 && (
            <div className="text-xs text-yellow-600">({gameState.blackKings} ♛)</div>
          )}
        </div>
      </div>

      {/* Turn indicator */}
      <div className="mb-3 sm:mb-4 text-center" role="status" aria-live="polite">
        <p className="text-base sm:text-lg font-semibold text-gray-700">
          {gameState.currentPlayer === 1 ? 'Your Turn' : `${character.name}'s Turn`}
        </p>
        {gameState.mustJump && gameState.currentPlayer === 1 && (
          <p className="text-sm text-red-600 font-semibold">You must jump!</p>
        )}
        {gameState.currentPlayer === 2 && gameState.status === 'playing' && (
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-gray-800" />
            <span className="text-sm text-gray-600">{character.name} is thinking...</span>
          </div>
        )}
      </div>

      {/* Board */}
      <Board
        board={gameState.board}
        onSquareClick={handleSquareClick}
        isHighlighted={isHighlighted}
        isPieceSelected={isPieceSelected}
        disabled={isAnimating || gameState.status !== 'playing'}
        lastMove={gameState.lastMove}
        animatingPiece={animatingPiece}
        capturedPiece={capturedPiece}
        promotedPiece={promotedPiece}
      />

      {/* Game Controls */}
      <div className="mt-4 sm:mt-8 mb-4 w-full max-w-2xl px-2">
        <GameControls
          difficulty={gameState.difficulty}
          onDifficultyChange={handleDifficultyChange}
          onNewGame={handleNewGame}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onShowHelp={() => setShowTutorial(true)}
          onUndo={undoMove}
          canUndo={canUndo}
          gameMode={gameState.mode}
          gameStatus={gameState.status}
        />
      </div>

      {/* Victory Dialog */}
      {showVictoryDialog && (
        <VictoryDialog
          open={showVictoryDialog}
          winner={gameState.winner}
          character={character}
          onPlayAgain={handleNewGame}
          onClose={() => setVictoryDialogDismissed(true)}
          blackCount={gameState.blackCount}
          redCount={gameState.redCount}
        />
      )}

      {/* Leaderboard Dialog */}
      {showLeaderboard && (
        <LeaderboardDialog
          open={showLeaderboard}
          stats={stats}
          onClose={() => setShowLeaderboard(false)}
          onUpdatePlayerName={updatePlayerName}
          onResetStats={resetStats}
        />
      )}

      {/* Tutorial Dialog */}
      <Tutorial
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
      />
    </div>
  )
}
