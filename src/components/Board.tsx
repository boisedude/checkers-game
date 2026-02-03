/**
 * Checkers Board Component
 * Renders the 8x8 checkerboard with premium wood texture and frame
 */

import React from 'react'
import type { Board as BoardType, Move, Position } from '@/types/checkers.types'
import { Cell } from './Cell'

// Column labels for algebraic notation (a-h)
const COLUMN_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

interface BoardProps {
  board: BoardType
  onSquareClick: (row: number, col: number) => void
  isHighlighted: (row: number, col: number) => boolean
  isPieceSelected: (row: number, col: number) => boolean
  disabled?: boolean
  lastMove?: Move
  animatingPiece?: {
    from: Position
    to: Position
    isJump: boolean
  } | null
  capturedPiece?: Position | null
  promotedPiece?: Position | null
}

export const Board = React.memo(function Board({
  board,
  onSquareClick,
  isHighlighted,
  isPieceSelected,
  disabled = false,
  lastMove,
  animatingPiece,
  capturedPiece,
  promotedPiece,
}: BoardProps) {
  return (
    <div className="w-full max-w-[95vw] sm:max-w-2xl mx-auto px-1 sm:px-0">
      {/* Wooden Frame */}
      <div className="board-frame">
        {/* Inner Board with Shadow */}
        <div className="board-inner">
          <div
            className="grid grid-cols-8 gap-0 aspect-square"
            role="grid"
            aria-label="Checkers game board"
          >
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isDark = (rowIndex + colIndex) % 2 === 1

                // Calculate animation state for this cell
                const isAnimatingTo =
                  animatingPiece &&
                  animatingPiece.to.row === rowIndex &&
                  animatingPiece.to.col === colIndex

                const isBeingCaptured =
                  capturedPiece &&
                  capturedPiece.row === rowIndex &&
                  capturedPiece.col === colIndex

                const isBeingPromoted =
                  promotedPiece &&
                  promotedPiece.row === rowIndex &&
                  promotedPiece.col === colIndex

                // Calculate slide offset for animation
                let slideFromX = 0
                let slideFromY = 0
                if (isAnimatingTo && animatingPiece) {
                  const cellSize = 100 / 8 // percentage
                  slideFromX =
                    (animatingPiece.from.col - animatingPiece.to.col) * cellSize
                  slideFromY =
                    (animatingPiece.from.row - animatingPiece.to.row) * cellSize
                }

                return (
                  <Cell
                    key={`${rowIndex}-${colIndex}`}
                    row={rowIndex}
                    col={colIndex}
                    piece={cell}
                    onClick={onSquareClick}
                    isHighlighted={!disabled && isHighlighted(rowIndex, colIndex)}
                    isSelected={!disabled && isPieceSelected(rowIndex, colIndex)}
                    isDark={isDark}
                    disabled={disabled}
                    isAnimating={isAnimatingTo || false}
                    isJumpAnimation={animatingPiece?.isJump || false}
                    slideFromX={slideFromX}
                    slideFromY={slideFromY}
                    isBeingCaptured={isBeingCaptured || false}
                    isBeingPromoted={isBeingPromoted || false}
                    lastMoveFrom={
                      lastMove?.from.row === rowIndex &&
                      lastMove?.from.col === colIndex
                    }
                    lastMoveTo={
                      lastMove?.to.row === rowIndex &&
                      lastMove?.to.col === colIndex
                    }
                  />
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Column labels (a-h) */}
      <div className="grid grid-cols-8 gap-0 mt-2 sm:mt-3 text-center text-xs sm:text-sm text-amber-900 font-semibold">
        {COLUMN_LABELS.map(label => (
          <div key={label}>{label}</div>
        ))}
      </div>
    </div>
  )
})
