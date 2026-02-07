/**
 * CheckersGame Page
 *
 * Top-level page component. Composes all hooks and UI components.
 * Responsibilities:
 * - Wires useCheckersGame (state) with useLeaderboard, useAchievements, useGameHistory
 * - Plays sound effects in response to game state changes (moves, game end, achievements)
 * - Handles game-end side effects: stats recording, Bentley API calls, achievement checks
 * - Manages dialog visibility (victory, leaderboard, achievements, history, tutorial)
 * - Keyboard shortcut: U key for undo
 * - Tutorial auto-shows on first visit (after game starts, not during setup)
 *
 * Game end handling uses prevStatusRef + gameEndHandledRef to fire side effects
 * exactly once per game transition from 'playing' to 'won'/'draw'.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Board } from '@/components/Board'
import { GameControls } from '@/components/GameControls'
import { VictoryDialog } from '@/components/VictoryDialog'
import { LeaderboardDialog } from '@/components/LeaderboardDialog'
import { Tutorial } from '@/components/Tutorial'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { AudioControls } from '@/components/AudioControls'
import { AchievementNotification } from '@/components/AchievementNotification'
import { AchievementsDialog } from '@/components/AchievementsDialog'
import { GameHistoryDialog } from '@/components/GameHistoryDialog'
import { Button } from '@/components/ui/button'
import { useCheckersGame } from '@/hooks/useCheckersGame'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useGameAudio } from '@/hooks/useGameAudio'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'
import { useCharacterSelection } from '@/hooks/useCharacterSelection'
import { useBentleyStats } from '@/hooks/useBentleyStats'
import { useMainSiteBentleyStats } from '@/hooks/useMainSiteBentleyStats'
import { useAchievements } from '@/hooks/useAchievements'
import type { AchievementContext } from '@/hooks/useAchievements'
import { useGameHistory } from '@/hooks/useGameHistory'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import { PROMOTION_SOUND_DELAY_MS } from '@/lib/gameConstants'

/** Delay before showing tutorial on first visit (ms) */
const TUTORIAL_SHOW_DELAY_MS = 500

export function CheckersGame() {
  const {
    gameState,
    isAnimating,
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
    hasSavedGame: hasSaved,
  } = useCheckersGame()

  const { character, changeCharacter } = useCharacterSelection(gameState.difficulty)
  const { recordBentleyWin: recordLocalBentleyWin, recordBentleyLoss: recordLocalBentleyLoss, recordBentleyDraw } = useBentleyStats()
  const mainSiteBentleyStats = useMainSiteBentleyStats()
  const { stats, recordWin, recordLoss, recordDraw, updatePlayerName, resetStats } = useLeaderboard()
  const { isMuted: isSfxMuted, toggleMute: toggleSfxMute, playDiscPlace, playVictory, playDefeat, playDraw, playCapture, playMultiJump, playKingPromotion, playAchievementUnlock } = useGameAudio()
  const { isMusicMuted, toggleMusicMute } = useBackgroundMusic(gameState.status === 'playing')
  const { achievements, checkAchievements, recentlyUnlocked, clearRecentlyUnlocked } = useAchievements()
  const { history: gameHistory, addRecord: addGameRecord, clearHistory: clearGameHistory } = useGameHistory()

  const [victoryDialogDismissed, setVictoryDialogDismissed] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const gameStartTimeRef = useRef<number>(0)
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TUTORIAL_COMPLETED) === 'true'
    } catch {
      console.warn('checkers: localStorage unavailable')
      return false
    }
  })
  const prevStatusRef = useRef(gameState.status)
  const gameEndHandledRef = useRef(false)

  const isPvP = gameState.mode === 'pvp'
  const isSetup = gameState.status === 'setup'

  // Show tutorial on first visit (only after game starts, not during setup)
  useEffect(() => {
    if (!hasCompletedTutorial && gameState.status === 'playing') {
      const timer = setTimeout(() => {
        setShowTutorial(true)
      }, TUTORIAL_SHOW_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedTutorial, gameState.status])

  // Handle tutorial completion
  const handleTutorialComplete = useCallback(() => {
    setHasCompletedTutorial(true)
    try {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_COMPLETED, 'true')
    } catch {
      // localStorage may be unavailable or full
      console.warn('checkers: localStorage unavailable')
    }
  }, [])

  // Track game start time for duration calculation
  useEffect(() => {
    if (gameState.status === 'playing' && gameStartTimeRef.current === 0) {
      gameStartTimeRef.current = Date.now()
    } else if (gameState.status === 'setup') {
      gameStartTimeRef.current = 0
    }
  }, [gameState.status])

  // Derive whether to show victory dialog from game state
  // Don't show during setup or while animations are still running
  const showVictoryDialog =
    gameState.status !== 'playing' &&
    gameState.status !== 'setup' &&
    !isAnimating &&
    !victoryDialogDismissed

  // Handle game end side effects (sounds, stats recording)
  useEffect(() => {
    const prevStatus = prevStatusRef.current

    if (prevStatus === 'playing' && gameState.status !== 'playing' && gameState.status !== 'setup' && !gameEndHandledRef.current) {
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
          // Player wins (or Red wins in PvP)
          playVictory()
          if (!isPvP) {
            recordWin(margin, totalCaptures, isPerfect)

            // Track Bentley stats if playing on hard
            if (gameState.difficulty === 'hard') {
              recordLocalBentleyWin(margin, totalCaptures, isPerfect)
              mainSiteBentleyStats.recordBentleyLoss()
            }
          }
        } else if (gameState.winner === 2) {
          // AI wins (or Black wins in PvP)
          if (isPvP) {
            playVictory()
          } else {
            playDefeat()
            recordLoss(totalCaptures)

            // Track Bentley stats if playing on hard
            if (gameState.difficulty === 'hard') {
              recordLocalBentleyLoss(margin, totalCaptures)
              mainSiteBentleyStats.recordBentleyWin()
            }
          }
        }
      } else if (gameState.status === 'draw') {
        playDraw()
        if (!isPvP) {
          recordDraw(totalCaptures)

          // Track Bentley stats if playing on hard
          if (gameState.difficulty === 'hard') {
            recordBentleyDraw(totalCaptures)
          }
        }
      }

      // Record game history
      const duration = gameStartTimeRef.current > 0
        ? Math.round((Date.now() - gameStartTimeRef.current) / 1000)
        : 0
      const result = gameState.status === 'draw'
        ? 'draw'
        : gameState.winner === 1 ? 'win' : 'loss'
      addGameRecord({
        date: Date.now(),
        mode: gameState.mode,
        difficulty: gameState.difficulty,
        result,
        winner: gameState.winner,
        moveCount: gameState.moveHistory.length,
        redCount: gameState.redCount,
        blackCount: gameState.blackCount,
        duration,
      })
      gameStartTimeRef.current = 0

      // Check achievements (only applies in PvC mode)
      if (!isPvP) {
        const maxJumpsInOneMove = gameState.moveHistory.reduce(
          (max, move) => Math.max(max, move.jumps.length),
          0
        )
        const playerGotKing = gameState.moveHistory.some(
          m => m.player === 1 && m.becameKing
        )
        const hadKingCaptured = gameState.hadKingCaptured
        const wasDownBy3OrMore = gameState.wasDownBy3OrMore

        const achievementContext: AchievementContext = {
          winner: gameState.winner,
          playerIs: 1,
          difficulty: gameState.difficulty,
          mode: gameState.mode,
          moveCount: gameState.moveHistory.length,
          redCount: gameState.redCount,
          blackCount: gameState.blackCount,
          maxJumpsInOneMove,
          hadKingCaptured,
          playerGotKing,
          wasDownBy3OrMore,
          currentWinStreak: stats.winStreak,
          totalGamesPlayed: stats.totalGames + 1,
          totalCapturesAllTime: stats.totalCaptures + totalCaptures,
        }
        checkAchievements(achievementContext)
      }
    }

    prevStatusRef.current = gameState.status
  }, [gameState.status, gameState.winner, gameState.difficulty, gameState.redCount, gameState.blackCount, gameState.moveHistory, gameState.mode, gameState.hadKingCaptured, gameState.wasDownBy3OrMore, isPvP, playVictory, playDefeat, playDraw, recordWin, recordLoss, recordDraw, recordLocalBentleyWin, recordLocalBentleyLoss, recordBentleyDraw, mainSiteBentleyStats, addGameRecord, checkAchievements, stats])

  // Play sound when moves are made (differentiated by move type)
  useEffect(() => {
    if (gameState.lastMove) {
      const move = gameState.lastMove
      if (move.jumps.length > 1) {
        playMultiJump()
      } else if (move.jumps.length === 1) {
        playCapture()
      } else {
        playDiscPlace()
      }
      if (move.becameKing) {
        // Play promotion sound with slight delay so it follows the move sound
        setTimeout(() => playKingPromotion(), PROMOTION_SOUND_DELAY_MS)
      }
    }
  }, [gameState.lastMove, playDiscPlace, playCapture, playMultiJump, playKingPromotion])

  // Play achievement unlock sound
  useEffect(() => {
    if (recentlyUnlocked) {
      playAchievementUnlock()
    }
  }, [recentlyUnlocked, playAchievementUnlock])

  const handleNewGame = useCallback(() => {
    setVictoryDialogDismissed(false)
    gameEndHandledRef.current = false
    startNewGame()
  }, [startNewGame])

  const handleStartGame = useCallback(() => {
    setVictoryDialogDismissed(false)
    gameEndHandledRef.current = false
    gameStartTimeRef.current = Date.now()
    startGame(gameState.mode, gameState.difficulty)
  }, [startGame, gameState.mode, gameState.difficulty])

  const handleResumeGame = useCallback(() => {
    setVictoryDialogDismissed(false)
    gameEndHandledRef.current = false
    gameStartTimeRef.current = Date.now()
    resumeGame()
  }, [resumeGame])

  const handleReturnToSetup = useCallback(() => {
    gameEndHandledRef.current = false
    returnToSetup()
  }, [returnToSetup])

  const handleDifficultyChange = useCallback(
    (difficulty: 'easy' | 'medium' | 'hard') => {
      changeDifficulty(difficulty)
      changeCharacter(difficulty)
    },
    [changeDifficulty, changeCharacter]
  )

  const handleModeChange = useCallback(
    (mode: 'pvp' | 'pvc') => {
      changeMode(mode)
    },
    [changeMode]
  )

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

  // Setup / Welcome screen
  if (isSetup) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-br from-gray-100 to-gray-200 p-2 sm:p-4 sm:justify-center">
        {/* Audio Controls - top right */}
        <div className="fixed top-2 right-2 z-50">
          <AudioControls
            isSfxMuted={isSfxMuted}
            isMusicMuted={isMusicMuted}
            onToggleSfx={toggleSfxMute}
            onToggleMusic={toggleMusicMute}
          />
        </div>

        {/* Return to Arcade Button */}
        <div className="w-full max-w-lg mb-3 sm:mb-4 px-4">
          <a href="https://www.mcooper.com/arcade/" className="block">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base font-semibold border-2 hover:bg-gray-100 hover:border-gray-400"
            >
              ← Return to Arcade
            </Button>
          </a>
        </div>

        <WelcomeScreen
          mode={gameState.mode}
          difficulty={gameState.difficulty}
          onModeChange={handleModeChange}
          onDifficultyChange={handleDifficultyChange}
          onStartGame={handleStartGame}
          hasSavedGame={hasSaved()}
          onResumeGame={handleResumeGame}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-br from-gray-100 to-gray-200 p-2 sm:p-4 sm:justify-center">
      {/* Audio Controls - top right */}
      <div className="fixed top-2 right-2 z-50">
        <AudioControls
          isSfxMuted={isSfxMuted}
          isMusicMuted={isMusicMuted}
          onToggleSfx={toggleSfxMute}
          onToggleMusic={toggleMusicMute}
        />
      </div>

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

      {/* Character Info (PvC only) */}
      {!isPvP && (
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
      )}

      {/* Game Info */}
      <div className="mb-3 sm:mb-6 flex gap-4 sm:gap-8 rounded-lg bg-white p-3 sm:p-4 shadow-lg w-full max-w-md" role="region" aria-label="Piece count">
        <div className="text-center flex-1">
          <div className="text-xl sm:text-2xl font-bold text-red-600">{gameState.redCount}</div>
          <div className="text-xs sm:text-sm text-gray-600">{isPvP ? 'Red' : 'Your Pieces'}</div>
          {gameState.redKings > 0 && (
            <div className="text-xs text-yellow-600">({gameState.redKings} ♛)</div>
          )}
        </div>
        <div className="border-l border-gray-300" />
        <div className="text-center flex-1">
          <div className="text-xl sm:text-2xl font-bold text-gray-800">{gameState.blackCount}</div>
          <div className="text-xs sm:text-sm text-gray-600">{isPvP ? 'Black' : `${character.name}'s Pieces`}</div>
          {gameState.blackKings > 0 && (
            <div className="text-xs text-yellow-600">({gameState.blackKings} ♛)</div>
          )}
        </div>
      </div>

      {/* Turn indicator */}
      <div className="mb-3 sm:mb-4 text-center" role="status" aria-live="polite">
        <p className="text-base sm:text-lg font-semibold text-gray-700">
          {isPvP
            ? gameState.currentPlayer === 1
              ? "Red's Turn"
              : "Black's Turn"
            : gameState.currentPlayer === 1
              ? 'Your Turn'
              : `${character.name}'s Turn`
          }
        </p>
        {gameState.mustJump && gameState.currentPlayer === 1 && !isPvP && (
          <p className="text-sm text-red-600 font-semibold">You must jump!</p>
        )}
        {gameState.mustJump && isPvP && (
          <p className="text-sm text-red-600 font-semibold">
            {gameState.currentPlayer === 1 ? 'Red' : 'Black'} must jump!
          </p>
        )}
        {!isPvP && gameState.currentPlayer === 2 && gameState.status === 'playing' && (
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
        intermediateBoard={intermediateBoard}
      />

      {/* Game Controls */}
      <div className="mt-4 sm:mt-8 mb-4 w-full max-w-2xl px-2">
        <GameControls
          difficulty={gameState.difficulty}
          onDifficultyChange={handleDifficultyChange}
          onNewGame={handleNewGame}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onShowHelp={() => setShowTutorial(true)}
          onShowAchievements={() => setShowAchievements(true)}
          onShowHistory={() => setShowHistory(true)}
          onReturnToSetup={handleReturnToSetup}
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
          gameMode={gameState.mode}
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

      {/* Achievements Dialog */}
      <AchievementsDialog
        open={showAchievements}
        onClose={() => setShowAchievements(false)}
        achievements={achievements}
      />

      {/* Game History Dialog */}
      <GameHistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={gameHistory}
        onClearHistory={clearGameHistory}
      />

      {/* Achievement Notification Toast */}
      <AchievementNotification
        achievement={recentlyUnlocked ? achievements[recentlyUnlocked] : null}
        onDismiss={clearRecentlyUnlocked}
      />
    </div>
  )
}
