/**
 * Main Site Bentley Stats Hook
 *
 * Exports: useMainSiteBentleyStats() -> { stats, loading, error, recordBentleyWin/Loss, refresh }
 * Connects to the mcooper.com API for global cross-game Bentley win/loss tracking.
 * Falls back to zeroed mock data on network error (does not block gameplay).
 * API base URL configurable via VITE_API_BASE env var.
 */

import { useState, useEffect, useCallback } from 'react'

export interface MainSiteBentleyStats {
  wins: number
  losses: number
  total: number
  winRate: number
  bentleyWinRate: number
  date: string
}

/** Type guard for API response data. */
function isValidMainSiteBentleyStats(data: unknown): data is MainSiteBentleyStats {
  if (!data || typeof data !== 'object') {
    return false
  }

  const stats = data as Partial<MainSiteBentleyStats>

  return (
    typeof stats.wins === 'number' &&
    stats.wins >= 0 &&
    typeof stats.losses === 'number' &&
    stats.losses >= 0 &&
    typeof stats.total === 'number' &&
    stats.total >= 0 &&
    typeof stats.winRate === 'number' &&
    typeof stats.bentleyWinRate === 'number' &&
    typeof stats.date === 'string'
  )
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://www.mcooper.com/api'

export function useMainSiteBentleyStats() {
  const [stats, setStats] = useState<MainSiteBentleyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/bentley-stats.php`)

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()

      if (data.success) {
        const parsed = {
          wins: data.wins,
          losses: data.losses,
          total: data.total,
          winRate: data.winRate,
          bentleyWinRate: data.bentleyWinRate,
          date: data.date,
        }

        if (!isValidMainSiteBentleyStats(parsed)) {
          throw new Error('Invalid data structure from API')
        }

        setStats(parsed)
      } else {
        throw new Error('Invalid response from API')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')

      // Set mock data for development/testing
      setStats({
        wins: 0,
        losses: 0,
        total: 0,
        winRate: 0,
        bentleyWinRate: 0,
        date: new Date().toISOString().split('T')[0],
      })
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  /** Record when Bentley wins (player loses). Fire-and-forget POST. */
  const recordBentleyWin = async () => {
    try {
      await fetch(`${API_BASE}/bentley-win.php`, { method: 'POST' })
      await fetchStats() // Refresh stats
    } catch (e) {
      // Network error - stats update silently fails
      console.warn('checkers: API request failed', e)
    }
  }

  /** Record when Bentley loses (player wins). Fire-and-forget POST. */
  const recordBentleyLoss = async () => {
    try {
      await fetch(`${API_BASE}/bentley-loss.php`, { method: 'POST' })
      await fetchStats() // Refresh stats
    } catch (e) {
      // Network error - stats update silently fails
      console.warn('checkers: API request failed', e)
    }
  }

  return {
    stats,
    loading,
    error,
    recordBentleyWin, // Call when Bentley wins (player loses)
    recordBentleyLoss, // Call when Bentley loses (player wins)
    refresh: fetchStats,
  }
}
