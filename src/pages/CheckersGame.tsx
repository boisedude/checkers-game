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
import { OpponentChip } from '@/components/OpponentChip'
import { Button } from '@/components/ui/button'
import { useCheckersGame } from '@/hooks/useCheckersGame'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useGameAudio } from '@/hooks/useGameAudio'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'
import { useCharacterSelection, getInitialDifficulty } from '@/hooks/useCharacterSelection'
import { useBentleyStats } from '@/hooks/useBentleyStats'
import { recordPlayerBeatBentley, recordBentleyBeatPlayer } from '@shared/arcadeRecord'
import { useAchievements } from '@/hooks/useAchievements'
import type { AchievementContext } from '@/hooks/useAchievements'
import { useGameHistory } from '@/hooks/useGameHistory'
import { ArrowLeftIcon, HelpIcon } from '@shared/icons'
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
  } = useCheckersGame(getInitialDifficulty())

  const { character } = useCharacterSelection(gameState.difficulty)
  const { recordBentleyWin: recordLocalBentleyWin, recordBentleyLoss: recordLocalBentleyLoss, recordBentleyDraw } = useBentleyStats()
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

  // Arrived from the arcade with a valid ?character=: the opponent is chosen, so skip
  // setup and start a one-player game at once. Runs once.
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (autoStartedRef.current) return
    autoStartedRef.current = true
    let id: string | null = null
    try {
      id = new URLSearchParams(window.location.search).get('character')?.toLowerCase() ?? null
    } catch {
      id = null
    }
    if (id === 'bella' || id === 'coop' || id === 'bentley') {
      gameStartTimeRef.current = Date.now()
      startGame('pvc', getInitialDifficulty())
    }
  }, [startGame])

  // Show tutorial on first visit (only after game starts, not during setup).
  // Never when launched from the arcade with ?character=, which picked the
  // opponent already and expects play to start at once.
  useEffect(() => {
    let launchedFromArcade = false
    try {
      launchedFromArcade = new URLSearchParams(window.location.search).has('character')
    } catch {
      launchedFromArcade = false
    }
    if (!hasCompletedTutorial && !launchedFromArcade && gameState.status === 'playing') {
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
              recordPlayerBeatBentley()
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
              recordBentleyBeatPlayer()
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
  }, [gameState.status, gameState.winner, gameState.difficulty, gameState.redCount, gameState.blackCount, gameState.moveHistory, gameState.mode, gameState.hadKingCaptured, gameState.wasDownBy3OrMore, isPvP, playVictory, playDefeat, playDraw, recordWin, recordLoss, recordDraw, recordLocalBentleyWin, recordLocalBentleyLoss, recordBentleyDraw, addGameRecord, checkAchievements, stats])

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
    },
    [changeDifficulty]
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

  const opponent = character.name
  const kingsNote = (kings: number) => (kings > 0 ? ` (${kings} ${kings === 1 ? 'king' : 'kings'})` : '')

  let turnText: string
  if (gameState.status === 'won') {
    turnText = isPvP
      ? gameState.winner === 1
        ? 'Red won'
        : 'Black won'
      : gameState.winner === 1
        ? 'You won'
        : `${opponent} won`
  } else if (gameState.status === 'draw') {
    turnText = 'Draw'
  } else if (isPvP) {
    const side = gameState.currentPlayer === 1 ? 'Red' : 'Black'
    turnText = gameState.mustJump ? `${side} must jump` : `${side}'s turn`
  } else if (gameState.currentPlayer === 1) {
    turnText = gameState.mustJump ? 'You must jump' : 'Your turn'
  } else {
    turnText = `${opponent} is thinking`
  }
  const turnActive =
    gameState.status === 'won' || gameState.status === 'draw'
      ? 'over'
      : !isPvP && gameState.currentPlayer === 2
        ? 'opponent'
        : 'you'

  const topBar = (
    <header className="arcade-topbar">
      <div className="flex flex-1 items-center">
        <a
          href="https://www.mcooper.com/arcade/"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon size={18} />
          Arcade
        </a>
      </div>
      <h1 className="arcade-display sr-only text-xl sm:not-sr-only">Checkers</h1>
      <div className="flex flex-1 items-center justify-end gap-1">
        {!isSetup && !isPvP && (
          <OpponentChip
            character={character}
            difficulty={gameState.difficulty}
            onDifficultyChange={handleDifficultyChange}
          />
        )}
        <AudioControls
          isSfxMuted={isSfxMuted}
          isMusicMuted={isMusicMuted}
          onToggleSfx={toggleSfxMute}
          onToggleMusic={toggleMusicMute}
        />
        {!isSetup && (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => setShowTutorial(true)}
            aria-label="How to play"
          >
            <HelpIcon />
          </Button>
        )}
      </div>
    </header>
  )

  // Setup / Welcome screen
  if (isSetup) {
    return (
      <div className="arcade-page">
        {topBar}
        <main className="arcade-stage">
          <WelcomeScreen
            mode={gameState.mode}
            difficulty={gameState.difficulty}
            onModeChange={handleModeChange}
            onDifficultyChange={handleDifficultyChange}
            onStartGame={handleStartGame}
            hasSavedGame={hasSaved()}
            onResumeGame={handleResumeGame}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="arcade-page">
      <a
        href="#game-board"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to game board
      </a>
      {topBar}

      <main className="arcade-stage">
        <div className="arcade-score" aria-live="polite">
          <div>
            <strong>{gameState.redCount}</strong>
            {isPvP ? 'Red' : 'You'}
            {kingsNote(gameState.redKings)}
          </div>
          <div className="arcade-turn" data-active={turnActive} role="status">
            {turnText}
          </div>
          <div>
            <strong>{gameState.blackCount}</strong>
            {isPvP ? 'Black' : opponent}
            {kingsNote(gameState.blackKings)}
          </div>
        </div>

        <div id="game-board" className="flex w-full justify-center">
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
        </div>

        <GameControls
          onNewGame={handleNewGame}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onShowHelp={() => setShowTutorial(true)}
          onShowAchievements={() => setShowAchievements(true)}
          onShowHistory={() => setShowHistory(true)}
          onReturnToSetup={handleReturnToSetup}
          onUndo={undoMove}
          canUndo={canUndo}
          gameStatus={gameState.status}
        />
      </main>

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

      {showLeaderboard && (
        <LeaderboardDialog
          open={showLeaderboard}
          stats={stats}
          onClose={() => setShowLeaderboard(false)}
          onUpdatePlayerName={updatePlayerName}
          onResetStats={resetStats}
        />
      )}

      <Tutorial
        open={showTutorial}
        onClose={() => {
          setShowTutorial(false)
          handleTutorialComplete()
        }}
        onComplete={handleTutorialComplete}
      />

      <AchievementsDialog
        open={showAchievements}
        onClose={() => setShowAchievements(false)}
        achievements={achievements}
      />

      <GameHistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={gameHistory}
        onClearHistory={clearGameHistory}
      />

      <AchievementNotification
        achievement={recentlyUnlocked ? achievements[recentlyUnlocked] : null}
        onDismiss={clearRecentlyUnlocked}
      />
    </div>
  )
}
