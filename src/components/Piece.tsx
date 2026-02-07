/**
 * Piece Component
 *
 * Renders a checker piece with 3D stacked effect for kings. Applies CSS animation
 * classes based on state: slide, jump, capture fade, king promotion, selection glow.
 * Crown SVG shown for kings with optional appear animation via isBeingPromoted.
 */

import React from 'react'
import type { Piece as PieceType } from '@/types/checkers.types'
import { cn } from '@/lib/utils'

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
  const isKing = piece.type === 'king'
  const isRed = piece.player === 1

  const animationClass = isBeingCaptured
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
      className={cn(
        'w-full h-full rounded-full flex items-center justify-center cursor-pointer relative transition-transform duration-200',
        isRed ? 'piece-red' : 'piece-black',
        isKing && 'piece-king',
        isSelected && 'piece-selected animate-selected-glow',
        animationClass,
      )}
      role="img"
      aria-label={pieceLabel}
    >
      {/* King crown - animate on promotion via isBeingPromoted prop */}
      {isKing && (
        <div
          className={cn('king-crown text-lg sm:text-2xl font-bold', isBeingPromoted && 'animate-crown-appear')}
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
          className={cn(
            'absolute -bottom-1 sm:-bottom-1.5 left-1/2 -translate-x-1/2 w-[85%] h-[85%] rounded-full -z-10',
            isRed ? 'bg-gradient-to-b from-red-800 to-red-950' : 'bg-gradient-to-b from-gray-800 to-black',
          )}
          style={{
            boxShadow: '0 3px 6px rgba(0,0,0,0.4)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Additional stacked layer for extra depth */}
      {isKing && (
        <div
          className={cn(
            'absolute -bottom-2 sm:-bottom-2.5 left-1/2 -translate-x-1/2 w-[75%] h-[75%] rounded-full -z-20',
            isRed ? 'bg-gradient-to-b from-red-900 to-red-950' : 'bg-gradient-to-b from-gray-900 to-black',
          )}
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
})
