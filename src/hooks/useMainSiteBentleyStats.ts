/**
 * Main Site Bentley Stats Hook
 * Connects to the main mcooper.com Bentley stats API
 * This tracks global Bentley stats across all games on the site
 */

import { useState, useEffect } from 'react';

export interface MainSiteBentleyStats {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  bentleyWinRate: number;
  date: string;
}

const API_BASE = 'https://www.mcooper.com/api';

export function useMainSiteBentleyStats() {
  const [stats, setStats] = useState<MainSiteBentleyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/bentley-stats.php`);

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();

      if (data.success) {
        setStats({
          wins: data.wins,
          losses: data.losses,
          total: data.total,
          winRate: data.winRate,
          bentleyWinRate: data.bentleyWinRate,
          date: data.date
        });
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (err) {
      console.error('Error fetching main site Bentley stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Set mock data for development/testing
      setStats({
        wins: 0,
        losses: 0,
        total: 0,
        winRate: 0,
        bentleyWinRate: 0,
        date: new Date().toISOString().split('T')[0]
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Record when Bentley wins (player loses)
   */
  const recordBentleyWin = async () => {
    try {
      await fetch(`${API_BASE}/bentley-win.php`, { method: 'POST' });
      await fetchStats(); // Refresh stats
    } catch (err) {
      console.error('Error recording Bentley win:', err);
    }
  };

  /**
   * Record when Bentley loses (player wins)
   */
  const recordBentleyLoss = async () => {
    try {
      await fetch(`${API_BASE}/bentley-loss.php`, { method: 'POST' });
      await fetchStats(); // Refresh stats
    } catch (err) {
      console.error('Error recording Bentley loss:', err);
    }
  };

  return {
    stats,
    loading,
    error,
    recordBentleyWin, // Call when Bentley wins (player loses)
    recordBentleyLoss, // Call when Bentley loses (player wins)
    refresh: fetchStats
  };
}
