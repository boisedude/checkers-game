/**
 * Checkers Cell Component
 * Represents a single square on the checkers board
 */

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
}

export function Cell({
  row,
  col,
  piece,
  onClick,
  isHighlighted,
  isSelected,
  isDark,
}: CellProps) {
  const handleClick = () => {
    onClick(row, col)
  }

  const baseClasses = `
    aspect-square
    flex items-center justify-center
    transition-all duration-200
    relative
    touch-manipulation
    active:scale-95
  `

  const bgClasses = isDark
    ? 'bg-amber-900'
    : 'bg-amber-100'

  const highlightClasses = isHighlighted
    ? 'ring-2 sm:ring-4 ring-green-400 ring-inset shadow-lg shadow-green-400/50'
    : ''

  const cursorClasses = (piece !== null || isHighlighted)
    ? 'cursor-pointer hover:brightness-110'
    : ''

  return (
    <div
      className={`${baseClasses} ${bgClasses} ${highlightClasses} ${cursorClasses}`}
      onClick={handleClick}
      data-row={row}
      data-col={col}
    >
      {/* Highlight indicator for valid moves */}
      {isHighlighted && !piece && (
        <div className="w-1/3 h-1/3 bg-green-400 rounded-full opacity-70 animate-pulse" />
      )}

      {/* Piece */}
      {piece && (
        <div className="w-4/5 h-4/5 p-0.5 sm:p-1">
          <Piece piece={piece} isSelected={isSelected} />
        </div>
      )}
    </div>
  )
}
