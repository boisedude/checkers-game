/**
 * Leaderboard Hook
 *
 * Exports: useLeaderboard() -> { stats, recordWin, recordLoss, recordDraw,
 * updatePlayerName, resetStats }
 *
 * Single-player cumulative stats persisted in localStorage.
 * Win streak resets on loss or draw. Tracks best margins and perfect games.
 */

import { useState, useEffect, useCallback } from 'react'
import type { LeaderboardEntry } from '@/types/checkers.types'
import { STORAGE_KEYS } from '@/lib/storageKeys'
const DEFAULT_PLAYER_NAME = 'Player'

/** Type guard for LeaderboardEntry from localStorage. */
function isValidLeaderboard(data: unknown): data is LeaderboardEntry {
  if (!data || typeof data !== 'object') {
    return false
  }

  const entry = data as Partial<LeaderboardEntry>

  return (
    typeof entry.playerName === 'string' &&
    typeof entry.wins === 'number' &&
    entry.wins >= 0 &&
    typeof entry.losses === 'number' &&
    entry.losses >= 0 &&
    typeof entry.draws === 'number' &&
    entry.draws >= 0 &&
    typeof entry.winStreak === 'number' &&
    entry.winStreak >= 0 &&
    typeof entry.longestWinStreak === 'number' &&
    entry.longestWinStreak >= 0 &&
    typeof entry.largestWinMargin === 'number' &&
    entry.largestWinMargin >= 0 &&
    typeof entry.perfectGames === 'number' &&
    entry.perfectGames >= 0 &&
    typeof entry.totalGames === 'number' &&
    entry.totalGames >= 0 &&
    typeof entry.totalCaptures === 'number' &&
    entry.totalCaptures >= 0
  )
}

function getInitialLeaderboard(): LeaderboardEntry {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LEADERBOARD)
    if (stored) {
      const data = JSON.parse(stored)

      // Validate data structure before using it
      if (isValidLeaderboard(data)) {
        return data
      } else {
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEYS.LEADERBOARD)
      }
    }
  } catch {
    // Clear corrupted data
    console.warn('checkers: localStorage unavailable')
    try {
      localStorage.removeItem(STORAGE_KEYS.LEADERBOARD)
    } catch {
      // Ignore errors when trying to clear
      console.warn('checkers: localStorage unavailable')
    }
  }

  return {
    playerName: DEFAULT_PLAYER_NAME,
    wins: 0,
    losses: 0,
    draws: 0,
    winStreak: 0,
    longestWinStreak: 0,
    largestWinMargin: 0,
    perfectGames: 0,
    totalGames: 0,
    totalCaptures: 0,
  }
}

export function useLeaderboard() {
  const [stats, setStats] = useState<LeaderboardEntry>(getInitialLeaderboard)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(stats))
    } catch {
      // Failed to save - stats will be lost but game continues
      console.warn('checkers: localStorage unavailable')
    }
  }, [stats])

  const recordWin = useCallback((margin: number, captures: number, isPerfect: boolean) => {
    setStats(prev => {
      const newWinStreak = prev.winStreak + 1
      const newLongestStreak = Math.max(newWinStreak, prev.longestWinStreak)
      const newLargestMargin = Math.max(prev.largestWinMargin, margin)
      const newPerfectGames = isPerfect ? prev.perfectGames + 1 : prev.perfectGames

      return {
        ...prev,
        wins: prev.wins + 1,
        winStreak: newWinStreak,
        longestWinStreak: newLongestStreak,
        largestWinMargin: newLargestMargin,
        perfectGames: newPerfectGames,
        totalGames: prev.totalGames + 1,
        totalCaptures: prev.totalCaptures + captures,
      }
    })
  }, [])

  const recordLoss = useCallback((captures: number) => {
    setStats(prev => ({
      ...prev,
      losses: prev.losses + 1,
      winStreak: 0,
      totalGames: prev.totalGames + 1,
      totalCaptures: prev.totalCaptures + captures,
    }))
  }, [])

  const recordDraw = useCallback((captures: number) => {
    setStats(prev => ({
      ...prev,
      draws: prev.draws + 1,
      winStreak: 0,
      totalGames: prev.totalGames + 1,
      totalCaptures: prev.totalCaptures + captures,
    }))
  }, [])

  const updatePlayerName = useCallback((name: string) => {
    setStats(prev => ({
      ...prev,
      playerName: name || DEFAULT_PLAYER_NAME,
    }))
  }, [])

  const resetStats = useCallback(() => {
    setStats({
      playerName: stats.playerName,
      wins: 0,
      losses: 0,
      draws: 0,
      winStreak: 0,
      longestWinStreak: 0,
      largestWinMargin: 0,
      perfectGames: 0,
      totalGames: 0,
      totalCaptures: 0,
    })
  }, [stats.playerName])

  return {
    stats,
    recordWin,
    recordLoss,
    recordDraw,
    updatePlayerName,
    resetStats,
  }
}
