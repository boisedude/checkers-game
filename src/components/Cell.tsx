/**
 * Cell Component
 *
 * One square. Pointer input is handled by the board (so a man can be dragged
 * across squares); the cell handles the keyboard. When the board shows a move,
 * the cell that received the man plays its travel along the move's path, and a
 * cell whose man was jumped shows it fading out as the mover passes over it.
 */

import React, { useLayoutEffect, useRef } from 'react'
import type { CellValue, Piece as PieceType } from '@/types/checkers.types'
import { Piece } from './Piece'

/** A path in squares relative to this cell, ending at {0, 0}. */
export interface Travel {
  path: { dx: number; dy: number }[]
  isJump: boolean
  /** Time per step of the path. */
  stepMs: number
}

interface CellProps {
  row: number
  col: number
  piece: CellValue
  onActivate: (row: number, col: number) => void
  isHighlighted: boolean
  isSelected: boolean
  isDark: boolean
  disabled?: boolean
  isLastMove?: boolean
  isHint?: boolean
  /** Ring the man: it must jump, or its move decided the game. */
  ring?: boolean
  travel?: Travel | null
  /** Changes with every move, so the travelling man remounts and its animation plays once. */
  animKey?: number
  /** The man jumped on this square by the move being shown, and when it starts to fade. */
  captured?: { piece: PieceType; delayMs: number } | null
  /** Crowned by the move being shown; the crown settles in after this many ms. */
  crownDelayMs?: number | null
  isDragOrigin?: boolean
}

function TravellingPiece({ travel, children }: { travel: Travel; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== 'function' || travel.path.length < 2) return
    const steps = travel.path.length - 1
    const at = (p: { dx: number; dy: number }, scale = 1) =>
      `translate(${p.dx * 100}%, ${p.dy * 100}%) scale(${scale})`
    const frames: Keyframe[] = []
    travel.path.forEach((p, i) => {
      if (i > 0 && travel.isJump) {
        // Each hop lifts the man a little as it passes over the jumped piece.
        const prev = travel.path[i - 1]
        frames.push({
          offset: (i - 0.5) / steps,
          transform: at({ dx: (prev.dx + p.dx) / 2, dy: (prev.dy + p.dy) / 2 }, 1.1),
          easing: 'cubic-bezier(0.45, 0, 0.8, 0.6)',
        })
      }
      frames.push({
        offset: i / steps,
        transform: at(p),
        easing: travel.isJump ? 'cubic-bezier(0.2, 0.4, 0.55, 1)' : 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      })
    })
    const animation = el.animate(frames, { duration: steps * travel.stepMs, fill: 'backwards' })
    return () => animation.cancel()
  }, [travel])
  return (
    <div ref={ref} className="ck-slot ck-travelling">
      {children}
    </div>
  )
}

export const Cell = React.memo(function Cell({
  row,
  col,
  piece,
  onActivate,
  isHighlighted,
  isSelected,
  isDark,
  disabled = false,
  isLastMove = false,
  isHint = false,
  ring = false,
  travel = null,
  animKey = 0,
  captured = null,
  crownDelayMs = null,
  isDragOrigin = false,
}: CellProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate(row, col)
    }
  }

  const classes = [
    'ck-cell',
    isDark ? 'ck-dark' : 'ck-light',
    isLastMove ? 'ck-last' : '',
    isSelected ? 'ck-selected' : '',
    !disabled && (piece !== null || isHighlighted) ? 'cursor-pointer' : '',
  ].join(' ')

  const cellPosition = `${String.fromCharCode(97 + col)}${8 - row}`
  const pieceDescription = piece
    ? `${piece.player === 1 ? 'Red' : 'Black'} ${piece.type === 'king' ? 'king' : 'piece'}`
    : ''
  const notes = `${ring && piece ? ', must jump' : ''}${isHint ? ', hint' : ''}`
  const cellDescription = piece
    ? `${cellPosition}: ${pieceDescription}${isSelected ? ', selected' : ''}${notes}`
    : isHighlighted
      ? `${cellPosition}: valid move destination${notes}`
      : `${cellPosition}: empty${notes}`

  const man = piece && (
    <Piece piece={piece} isSelected={isSelected} ring={ring && !isSelected} crownDelayMs={crownDelayMs} />
  )

  return (
    <div
      className={classes}
      onKeyDown={handleKeyDown}
      data-row={row}
      data-col={col}
      role="gridcell"
      aria-label={cellDescription}
      aria-selected={isSelected}
      aria-disabled={disabled}
      tabIndex={!disabled && isDark ? 0 : -1}
    >
      {captured && (
        <div
          key={`captured-${animKey}`}
          className="ck-slot ck-captured"
          style={{ animationDelay: `${captured.delayMs}ms` }}
          aria-hidden="true"
        >
          <Piece piece={captured.piece} />
        </div>
      )}

      {piece &&
        (travel ? (
          <TravellingPiece key={`travel-${animKey}`} travel={travel}>
            {man}
          </TravellingPiece>
        ) : (
          <div key={crownDelayMs !== null ? `crown-${animKey}` : 'still'} className={`ck-slot ${isDragOrigin ? 'opacity-30' : ''}`}>
            {man}
          </div>
        ))}

      {isHighlighted && !piece && <div className="valid-move-indicator" />}
      {isHint && <div className="ck-hint arcade-hint" aria-hidden="true" />}
    </div>
  )
})
