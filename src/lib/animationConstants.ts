/**
 * Animation timing (milliseconds).
 *
 * The game state changes the moment a move is made; these only say how long the
 * board takes to show it. A move slides one square, a jump slides two (hop by
 * hop for a multi-jump), the jumped man fades as the mover passes over it, and a
 * new king settles once at the end. Input is blocked for exactly that long.
 */

import type { Move } from '@/types/checkers.types'

/** Least time from the player's move to the opponent's reply landing (search time counts toward it). */
export const MIN_REPLY_MS = 600
/** One diagonal step. */
export const SLIDE_MS = 200
/** One hop of a jump (two squares). */
export const HOP_MS = 240
/** A jumped man fading out once the mover is over it. */
export const CAPTURE_FADE_MS = 180
/** A new king settling onto its second disc. */
export const CROWN_SETTLE_MS = 260

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** How long the board spends travelling the piece along the move. */
export function travelMs(move: Pick<Move, 'jumps'>): number {
  return move.jumps.length > 0 ? move.jumps.length * HOP_MS : SLIDE_MS
}

/** Total time the board needs to show a move, crowning included. */
export function moveAnimationMs(move: Pick<Move, 'jumps' | 'becameKing'>): number {
  if (prefersReducedMotion()) return 0
  return travelMs(move) + (move.becameKing ? CROWN_SETTLE_MS : 0)
}
