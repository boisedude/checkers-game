/**
 * Leaderboard Hook
 * Manages player statistics and leaderboard for Othello
 */

import { useState, useEffect, useCallback } from 'react'
import type { LeaderboardEntry } from '@/types/checkers.types'

const STORAGE_KEY = 'othello-leaderboard'
const DEFAULT_PLAYER_NAME = 'Player'

/**
 * Type guard to validate LeaderboardEntry structure
 * Protects against corrupted or malicious localStorage data
 */
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
    typeof entry.totalCaptures === 'number' &&
    entry.totalCaptures >= 0 &&
    typeof entry.kingsCreated === 'number' &&
    entry.kingsCreated >= 0 &&
    typeof entry.perfectGames === 'number' &&
    entry.perfectGames >= 0 &&
    typeof entry.totalGames === 'number' &&
    entry.totalGames >= 0 &&
    typeof entry.multiJumps === 'number' &&
    entry.multiJumps >= 0
  )
}

function getInitialLeaderboard(): LeaderboardEntry {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)

      // Validate data structure before using it
      if (isValidLeaderboard(data)) {
        return data
      } else {
        console.warn('Invalid leaderboard data in localStorage, resetting to defaults')
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  } catch (error) {
    console.error('Failed to load leaderboard:', error)
    // Clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore errors when trying to clear
    }
  }

  return {
    playerName: DEFAULT_PLAYER_NAME,
    wins: 0,
    losses: 0,
    draws: 0,
    winStreak: 0,
    longestWinStreak: 0,
    totalCaptures: 0,
    kingsCreated: 0,
    perfectGames: 0,
    totalGames: 0,
    multiJumps: 0,
  }
}

export function useLeaderboard() {
  const [stats, setStats] = useState<LeaderboardEntry>(getInitialLeaderboard)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
    } catch (error) {
      console.error('Failed to save leaderboard:', error)
    }
  }, [stats])

  const recordWin = useCallback((margin: number, discsFlipped: number, isPerfect: boolean) => {
    setStats(prev => {
      const newWinStreak = prev.winStreak + 1
      const newLongestStreak = Math.max(newWinStreak, prev.longestWinStreak)
      const newLargestMargin = Math.max(prev.totalCaptures, margin)
      const newPerfectGames = isPerfect ? prev.perfectGames + 1 : prev.perfectGames

      return {
        ...prev,
        wins: prev.wins + 1,
        winStreak: newWinStreak,
        longestWinStreak: newLongestStreak,
        totalCaptures: newLargestMargin,
        perfectGames: newPerfectGames,
        totalGames: prev.totalGames + 1,
        multiJumps: prev.multiJumps + discsFlipped,
      }
    })
  }, [])

  const recordLoss = useCallback((discsFlipped: number) => {
    setStats(prev => ({
      ...prev,
      losses: prev.losses + 1,
      winStreak: 0,
      totalGames: prev.totalGames + 1,
      multiJumps: prev.multiJumps + discsFlipped,
    }))
  }, [])

  const recordDraw = useCallback((discsFlipped: number) => {
    setStats(prev => ({
      ...prev,
      draws: prev.draws + 1,
      winStreak: 0,
      totalGames: prev.totalGames + 1,
      multiJumps: prev.multiJumps + discsFlipped,
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
      totalCaptures: 0,
      kingsCreated: 0,
      perfectGames: 0,
      totalGames: 0,
      multiJumps: 0,
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
