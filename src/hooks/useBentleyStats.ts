/**
 * Bentley Stats Hook
 * Track special stats when playing against Bentley (hard difficulty)
 */

import { useState, useCallback, useEffect } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'

export interface BentleyStats {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  perfectGames: number // Games where you beat Bentley with 0 discs for him
  closeCalls: number // Games lost by 3 or fewer discs
  totalFlips: number
  bestMargin: number // Best winning margin against Bentley
}


/**
 * Type guard to validate BentleyStats structure
 * Protects against corrupted or malicious localStorage data
 */
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
    typeof stats.totalFlips === 'number' &&
    stats.totalFlips >= 0 &&
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
    totalFlips: 0,
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
    try {
      localStorage.removeItem(STORAGE_KEYS.BENTLEY_STATS)
    } catch {
      // Ignore errors when trying to clear
    }
  }

  return getDefaultStats()
}

function saveStats(stats: BentleyStats): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BENTLEY_STATS, JSON.stringify(stats))
  } catch {
    // Silently fail - stats will be lost but game continues
  }
}

export function useBentleyStats() {
  const [stats, setStats] = useState<BentleyStats>(loadStats)

  // Save to localStorage whenever stats change
  useEffect(() => {
    saveStats(stats)
  }, [stats])

  const recordBentleyWin = useCallback((margin: number, totalFlips: number, isPerfect: boolean) => {
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      gamesWon: prev.gamesWon + 1,
      totalFlips: prev.totalFlips + totalFlips,
      perfectGames: isPerfect ? prev.perfectGames + 1 : prev.perfectGames,
      bestMargin: margin > prev.bestMargin ? margin : prev.bestMargin,
    }))
  }, [])

  const recordBentleyLoss = useCallback((margin: number, totalFlips: number) => {
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      gamesLost: prev.gamesLost + 1,
      totalFlips: prev.totalFlips + totalFlips,
      closeCalls: margin <= 3 ? prev.closeCalls + 1 : prev.closeCalls,
    }))
  }, [])

  const recordBentleyDraw = useCallback((totalFlips: number) => {
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      totalFlips: prev.totalFlips + totalFlips,
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
