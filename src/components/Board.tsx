/**
 * Checkers Board Component
 * Renders the 8x8 checkerboard
 */

import type { Board as BoardType } from '@/types/checkers.types'
import { Cell } from './Cell'

interface BoardProps {
  board: BoardType
  onSquareClick: (row: number, col: number) => void
  isHighlighted: (row: number, col: number) => boolean
  isPieceSelected: (row: number, col: number) => boolean
  disabled?: boolean
}

export function Board({
  board,
  onSquareClick,
  isHighlighted,
  isPieceSelected,
  disabled = false,
}: BoardProps) {
  return (
    <div className="w-full max-w-[95vw] sm:max-w-2xl mx-auto px-1 sm:px-0">
      <div className="grid grid-cols-8 gap-0 border-2 sm:border-4 border-amber-950 rounded-md sm:rounded-lg overflow-hidden shadow-2xl aspect-square">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isDark = (rowIndex + colIndex) % 2 === 1

            return (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                row={rowIndex}
                col={colIndex}
                piece={cell}
                onClick={disabled ? () => {} : onSquareClick}
                isHighlighted={!disabled && isHighlighted(rowIndex, colIndex)}
                isSelected={!disabled && isPieceSelected(rowIndex, colIndex)}
                isDark={isDark}
              />
            )
          })
        )}
      </div>

      {/* Column labels (a-h) */}
      <div className="grid grid-cols-8 gap-0 mt-1 sm:mt-2 text-center text-xs sm:text-sm text-gray-500 font-semibold">
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(label => (
          <div key={label}>{label}</div>
        ))}
      </div>
    </div>
  )
}
