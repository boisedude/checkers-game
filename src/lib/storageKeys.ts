/**
 * Storage Keys
 *
 * All localStorage keys used by the checkers game. Prefixed with "checkers-" to
 * avoid collisions with other games on the same domain.
 */

export const STORAGE_KEYS = {
  LEADERBOARD: 'checkers-leaderboard',
  BENTLEY_STATS: 'checkers-bentley-stats',
  AUDIO_MUTED: 'checkers-audio-muted',
  MUSIC_MUTED: 'checkers-music-muted',
  TUTORIAL_COMPLETED: 'checkers-tutorial-completed',
  ACHIEVEMENTS: 'checkers-achievements',
  GAME_HISTORY: 'checkers-game-history',
  SAVED_GAME: 'checkers-saved-game',
} as const
