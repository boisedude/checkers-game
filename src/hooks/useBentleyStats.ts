/**
 * Bentley Stats Hook
 *
 * Exports: useBentleyStats() -> { bentleyStats, recordBentleyWin/Loss/Draw, resetBentleyStats }
 * Local-only stats for games against Bentley (hard). Persisted in localStorage.
 * Separate from the main leaderboard -- tracks Bentley-specific metrics like close calls.
 */

import { useState, useCallback, useEffect } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'

export interface BentleyStats {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  perfectGames: number // Games where Bentley had 0 pieces left
  closeCalls: number // Games lost by 3 or fewer pieces
  totalCaptures: number
  bestMargin: number // Best winning margin against Bentley
}

/** Type guard for BentleyStats from localStorage. */
function isValidBentleyStats(data: unknown): data is BentleyStats {
  if (!data || typeof data !== 'object') {
    return false
  }

  const stats = data as Partial<BentleyStats>

  return (
    typeof stats.gamesPlayed === 'number' &&
    stats.gamesPlayed >= 0 &&
    typeof stats.gamesWon === 'number' &&
    stats.gamesWon >= 0 &&
    typeof stats.gamesLost === 'number' &&
    stats.gamesLost >= 0 &&
    typeof stats.perfectGames === 'number' &&
    stats.perfectGames >= 0 &&
    typeof stats.closeCalls === 'number' &&
    stats.closeCalls >= 0 &&
    typeof stats.totalCaptures === 'number' &&
    stats.totalCaptures >= 0 &&
    typeof stats.bestMargin === 'number' &&
    stats.bestMargin >= 0
  )
}

function getDefaultStats(): BentleyStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    perfectGames: 0,
    closeCalls: 0,
    totalCaptures: 0,
    bestMargin: 0,
  }
}

function loadStats(): BentleyStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BENTLEY_STATS)
    if (stored) {
      const data = JSON.parse(stored)

      // Validate data structure before using it
      if (isValidBentleyStats(data)) {
        return data
      } else {
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEYS.BENTLEY_STATS)
      }
    }
  } catch {
    // Clear corrupted data
    console.warn('checkers: localStorage unavailable')
    try {
      localStorage.removeItem(STORAGE_KEYS.BENTLEY_STATS)
    } catch {
      // Ignore errors when trying to clear
      console.warn('checkers: localStorage unavailable')
    }
  }

  return getDefaultStats()
}

function saveStats(stats: BentleyStats): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BENTLEY_STATS, JSON.stringify(stats))
  } catch {
    // Silently fail - stats will be lost but game continues
    console.warn('checkers: localStorage unavailable')
  }
}

export function useBentleyStats() {
  const [stats, setStats] = useState<BentleyStats>(loadStats)

  // Save to localStorage whenever stats change
  useEffect(() => {
    saveStats(stats)
  }, [stats])

  const recordBentleyWin = useCallback((margin: number, totalCaptures: number, isPerfect: boolean) => {
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      gamesWon: prev.gamesWon + 1,
      totalCaptures: prev.totalCaptures + totalCaptures,
      perfectGames: isPerfect ? prev.perfectGames + 1 : prev.perfectGames,
      bestMargin: margin > prev.bestMargin ? margin : prev.bestMargin,
    }))
  }, [])

  const recordBentleyLoss = useCallback((margin: number, totalCaptures: number) => {
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      gamesLost: prev.gamesLost + 1,
      totalCaptures: prev.totalCaptures + totalCaptures,
      closeCalls: margin <= 3 ? prev.closeCalls + 1 : prev.closeCalls,
    }))
  }, [])

  const recordBentleyDraw = useCallback((totalCaptures: number) => {
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      totalCaptures: prev.totalCaptures + totalCaptures,
    }))
  }, [])

  const resetBentleyStats = useCallback(() => {
    setStats(getDefaultStats())
  }, [])

  return {
    bentleyStats: stats,
    recordBentleyWin,
    recordBentleyLoss,
    recordBentleyDraw,
    resetBentleyStats,
  }
}
