/**
 * Animation Constants (milliseconds)
 *
 * Timing values for piece movement, capture, and promotion animations.
 * MOVE/JUMP durations must match their CSS animation counterparts in index.css.
 */

export const AI_MOVE_DELAY = 600 // Pause before AI starts moving
export const MOVE_ANIMATION_DURATION = 350 // Simple diagonal slide
export const JUMP_ANIMATION_DURATION = 500 // Jump arc animation
export const CAPTURE_ANIMATION_DURATION = 400 // Captured piece fade-out
export const PROMOTION_ANIMATION_DURATION = 800 // King crown appear
export const POST_ANIMATION_SETTLE_DELAY = 300 // Pause after animation before showing dialogs
