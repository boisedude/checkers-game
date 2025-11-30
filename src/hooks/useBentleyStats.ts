/**
 * Bentley Stats Hook
 * Track special stats when playing against Bentley (hard difficulty)
 */

import { useState, useCallback, useEffect } from 'react'

export interface BentleyStats {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  perfectGames: number // Games where you beat Bentley with 0 discs for him
  closeCalls: number // Games lost by 3 or fewer discs
  totalFlips: number
  bestMargin: number // Best winning margin against Bentley
}

const STORAGE_KEY = 'othello-bentley-stats'

function loadStats(): BentleyStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load Bentley stats:', error)
  }

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

function saveStats(stats: BentleyStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch (error) {
    console.error('Failed to save Bentley stats:', error)
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
    const emptyStats: BentleyStats = {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      perfectGames: 0,
      closeCalls: 0,
      totalFlips: 0,
      bestMargin: 0,
    }
    setStats(emptyStats)
  }, [])

  return {
    bentleyStats: stats,
    recordBentleyWin,
    recordBentleyLoss,
    recordBentleyDraw,
    resetBentleyStats,
  }
}
