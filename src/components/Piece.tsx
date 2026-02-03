/**
 * Checkers Piece Component
 * Renders a premium checker piece with 3D effects, shiny look, and animations
 */

import React, { useState, useEffect, useRef } from 'react'
import type { Piece as PieceType } from '@/types/checkers.types'
import { PROMOTION_ANIMATION_DURATION } from '@/lib/animationConstants'

interface PieceProps {
  piece: PieceType
  isSelected: boolean
  isAnimating?: boolean
  isJumpAnimation?: boolean
  isBeingCaptured?: boolean
  isBeingPromoted?: boolean
}

export const Piece = React.memo(function Piece({
  piece,
  isSelected,
  isAnimating = false,
  isJumpAnimation = false,
  isBeingCaptured = false,
  isBeingPromoted = false,
}: PieceProps) {
  const [showCrownAnimation, setShowCrownAnimation] = useState(false)
  const wasBeingPromotedRef = useRef(false)

  // Track when piece becomes king for animation
  // Only trigger animation on transition from false to true
  useEffect(() => {
    if (isBeingPromoted && !wasBeingPromotedRef.current) {
      // Schedule the state update asynchronously to avoid cascading renders
      const startTimer = setTimeout(() => setShowCrownAnimation(true), 0)
      const endTimer = setTimeout(() => setShowCrownAnimation(false), PROMOTION_ANIMATION_DURATION)
      wasBeingPromotedRef.current = true
      return () => {
        clearTimeout(startTimer)
        clearTimeout(endTimer)
      }
    }
    if (!isBeingPromoted) {
      wasBeingPromotedRef.current = false
    }
  }, [isBeingPromoted])

  const isKing = piece.type === 'king'
  const isRed = piece.player === 1

  // Base piece classes
  const baseClasses = `
    w-full h-full rounded-full
    flex items-center justify-center
    cursor-pointer
    relative
    transition-transform duration-200
  `

  // Premium piece color classes
  const colorClasses = isRed ? 'piece-red' : 'piece-black'

  // King stacked effect classes
  const kingClasses = isKing ? 'piece-king' : ''

  // Selected state classes
  const selectedClasses = isSelected
    ? 'piece-selected animate-selected-glow'
    : ''

  // Animation classes
  const animationClasses = isBeingCaptured
    ? 'animate-piece-capture'
    : isBeingPromoted
      ? 'animate-king-promotion'
      : isAnimating
        ? isJumpAnimation
          ? 'animate-piece-jump'
          : 'animate-piece-slide'
        : ''

  const pieceLabel = `${isRed ? 'Red' : 'Black'} ${isKing ? 'king' : 'piece'}${isSelected ? ', selected' : ''}`

  return (
    <div
      className={`${baseClasses} ${colorClasses} ${kingClasses} ${selectedClasses} ${animationClasses}`}
      role="img"
      aria-label={pieceLabel}
    >
      {/* King crown with animation */}
      {isKing && (
        <div
          className={`king-crown text-lg sm:text-2xl font-bold ${showCrownAnimation ? 'animate-crown-appear' : ''}`}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 sm:w-7 sm:h-7"
            style={{
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
            }}
          >
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
          </svg>
        </div>
      )}

      {/* Stacked piece effect for kings - second layer */}
      {isKing && (
        <div
          className={`absolute -bottom-1 sm:-bottom-1.5 left-1/2 -translate-x-1/2 w-[85%] h-[85%] rounded-full -z-10
            ${isRed ? 'bg-gradient-to-b from-red-800 to-red-950' : 'bg-gradient-to-b from-gray-800 to-black'}
          `}
          style={{
            boxShadow: '0 3px 6px rgba(0,0,0,0.4)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Additional stacked layer for extra depth */}
      {isKing && (
        <div
          className={`absolute -bottom-2 sm:-bottom-2.5 left-1/2 -translate-x-1/2 w-[75%] h-[75%] rounded-full -z-20
            ${isRed ? 'bg-gradient-to-b from-red-900 to-red-950' : 'bg-gradient-to-b from-gray-900 to-black'}
          `}
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
})
