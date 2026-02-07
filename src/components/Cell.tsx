/**
 * Cell Component
 *
 * Single board square. Handles click/keyboard interaction, piece rendering,
 * animation CSS variables (--slide-from-x/y), and accessible labels.
 * Only dark squares (isDark=true) are focusable.
 */

import React from 'react'
import type { CellValue } from '@/types/checkers.types'
import { Piece } from './Piece'

interface CellProps {
  row: number
  col: number
  piece: CellValue
  onClick: (row: number, col: number) => void
  isHighlighted: boolean
  isSelected: boolean
  isDark: boolean
  disabled?: boolean
  isAnimating?: boolean
  isJumpAnimation?: boolean
  slideFromX?: number
  slideFromY?: number
  isBeingCaptured?: boolean
  isBeingPromoted?: boolean
  lastMoveFrom?: boolean
  lastMoveTo?: boolean
}

export const Cell = React.memo(function Cell({
  row,
  col,
  piece,
  onClick,
  isHighlighted,
  isSelected,
  isDark,
  disabled = false,
  isAnimating = false,
  isJumpAnimation = false,
  slideFromX = 0,
  slideFromY = 0,
  isBeingCaptured = false,
  isBeingPromoted = false,
  lastMoveFrom = false,
  lastMoveTo = false,
}: CellProps) {
  const handleClick = () => {
    if (!disabled) {
      onClick(row, col)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(row, col)
    }
  }

  // Base cell classes
  const baseClasses = `
    aspect-square
    flex items-center justify-center
    transition-all duration-200
    relative
    touch-manipulation
  `

  // Wood texture classes
  const woodClasses = isDark ? 'wood-dark' : 'wood-light'

  // Highlight and selection classes
  const stateClasses = isHighlighted
    ? 'cell-highlighted'
    : isSelected
      ? 'cell-selected'
      : ''

  // Last move indicator classes
  const lastMoveClasses =
    (lastMoveFrom || lastMoveTo) && !isSelected && !isHighlighted
      ? 'ring-2 ring-inset ring-amber-400/40'
      : ''

  // Cursor classes
  const cursorClasses = disabled
    ? 'pointer-events-none'
    : piece !== null || isHighlighted
      ? 'cursor-pointer hover:brightness-110 active:brightness-95'
      : ''

  // Generate accessible label for the cell
  const columnLetter = String.fromCharCode(97 + col) // a-h
  const rowNumber = 8 - row // 1-8 from bottom
  const cellPosition = `${columnLetter}${rowNumber}`
  const pieceDescription = piece
    ? `${piece.player === 1 ? 'Red' : 'Black'} ${piece.type === 'king' ? 'king' : 'piece'}`
    : ''
  const cellDescription = piece
    ? `${cellPosition}: ${pieceDescription}${isSelected ? ', selected' : ''}`
    : isHighlighted
      ? `${cellPosition}: valid move destination`
      : `${cellPosition}: empty`

  return (
    <div
      className={`${baseClasses} ${woodClasses} ${stateClasses} ${lastMoveClasses} ${cursorClasses}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-row={row}
      data-col={col}
      role="gridcell"
      aria-label={cellDescription}
      aria-selected={isSelected}
      aria-disabled={disabled}
      tabIndex={!disabled && isDark ? 0 : -1}
    >
      {/* Highlight indicator for valid moves */}
      {isHighlighted && !piece && (
        <div className="valid-move-indicator animate-valid-move-glow" />
      )}

      {/* Piece */}
      {piece && (
        <div
          className="w-4/5 h-4/5 p-0.5 sm:p-1 relative z-10"
          style={
            isAnimating
              ? ({
                  '--slide-from-x': `${slideFromX}%`,
                  '--slide-from-y': `${slideFromY}%`,
                } as React.CSSProperties)
              : undefined
          }
        >
          <Piece
            piece={piece}
            isSelected={isSelected}
            isAnimating={isAnimating}
            isJumpAnimation={isJumpAnimation}
            isBeingCaptured={isBeingCaptured}
            isBeingPromoted={isBeingPromoted}
          />
        </div>
      )}
    </div>
  )
})
