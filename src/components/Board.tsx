/**
 * Board Component
 *
 * The 8x8 board in a walnut frame with coordinates in the frame. It owns the
 * presentation the game hook does not need to know about:
 * - showing a move: the game state is already final when a new move arrives; the
 *   board slides the man from where it started (hop by hop for a multi-jump),
 *   fades each jumped man as the mover passes it, and settles a new king once;
 * - dragging: a man can be picked up and dropped on a square, which reaches the
 *   game as the same two square activations a pair of taps would.
 */

import React, { useCallback, useState } from 'react'
import type { Board as BoardType, Move, Piece as PieceType, Position } from '@/types/checkers.types'
import { BOARD_SIZE } from '@/types/checkers.types'
import { Cell } from './Cell'
import type { Travel } from './Cell'
import { Piece } from './Piece'
import { HOP_MS, SLIDE_MS, prefersReducedMotion, travelMs } from '@/lib/animationConstants'

const FILE_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANK_LABELS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const
/** Pointer travel, in pixels, before a press becomes a drag. */
const DRAG_THRESHOLD = 6

interface BoardProps {
  board: BoardType
  onSquareClick: (row: number, col: number) => void
  isHighlighted: (row: number, col: number) => boolean
  isPieceSelected: (row: number, col: number) => boolean
  disabled?: boolean
  lastMove?: Move
  /** Number of moves played; a rise of one means lastMove is new and should be shown. */
  moveCount: number
  /** Squares of a suggested move (origin and every landing square), marked with a static ring */
  hintSquares?: Position[]
  /** Men that must jump this turn (captures are forced); each gets a brass ring. */
  mustJumpFrom?: Position[]
  /** The square of the man whose move decided the game. */
  decisiveSquare?: Position | null
}

interface Drag {
  row: number
  col: number
  startX: number
  startY: number
  x: number
  y: number
  size: number
  active: boolean
}

/** What the board plays for one new move. Kept in state so it is built once per move. */
interface MoveAnimation {
  key: number
  to: Position
  travel: Travel | null
  captured: { at: Position; piece: PieceType; delayMs: number }[]
  crownDelayMs: number | null
}

function squareAt(x: number, y: number): Position | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-row][data-col]')
  if (!el) return null
  return { row: Number(el.dataset.row), col: Number(el.dataset.col) }
}

function same(a: Position | undefined | null, row: number, col: number): boolean {
  return !!a && a.row === row && a.col === col
}

function movePath(move: Move): Position[] {
  return move.jumps.length > 0 ? [move.from, ...move.jumps.map(j => j.to)] : [move.from, move.to]
}

function buildAnimation(key: number, move: Move, prevBoard: BoardType, dropped: boolean): MoveAnimation {
  const isJump = move.jumps.length > 0
  const path = movePath(move)
  const travel: Travel | null = dropped
    ? null
    : {
        path: path.map(p => ({ dx: p.col - move.to.col, dy: p.row - move.to.row })),
        isJump,
        stepMs: isJump ? HOP_MS : SLIDE_MS,
      }
  const captured = move.jumps.flatMap((jump, i) => {
    const piece = prevBoard[jump.captured.row]?.[jump.captured.col]
    // The jumped man goes as the mover passes over it (halfway through its hop).
    return piece ? [{ at: jump.captured, piece, delayMs: dropped ? 0 : Math.round((i + 0.5) * HOP_MS) }] : []
  })
  return {
    key,
    to: move.to,
    travel,
    captured,
    crownDelayMs: move.becameKing ? (dropped ? 0 : travelMs(move)) : null,
  }
}

export const Board = React.memo(function Board({
  board,
  onSquareClick,
  isHighlighted,
  isPieceSelected,
  disabled = false,
  lastMove,
  moveCount,
  hintSquares,
  mustJumpFrom,
  decisiveSquare = null,
}: BoardProps) {
  const [drag, setDrag] = useState<Drag | null>(null)
  // The move a drag just delivered: the man is already where it was dropped, so it must not travel.
  const [dropped, setDropped] = useState<{ from: Position; to: Position } | null>(null)

  // Decide once per new move what to play (React's derive-state-from-props pattern).
  const [seen, setSeen] = useState({ count: moveCount, board })
  const [anim, setAnim] = useState<MoveAnimation | null>(null)
  if (moveCount !== seen.count) {
    setSeen({ count: moveCount, board })
    if (moveCount === seen.count + 1 && lastMove && !prefersReducedMotion()) {
      const wasDropped =
        !!dropped &&
        same(dropped.from, lastMove.from.row, lastMove.from.col) &&
        same(dropped.to, lastMove.to.row, lastMove.to.col)
      setAnim(buildAnimation(moveCount, lastMove, seen.board, wasDropped))
    } else {
      setAnim(null)
    }
    setDropped(null)
  }

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const arrowKeys: Record<string, { dRow: number; dCol: number }> = {
      ArrowUp: { dRow: -1, dCol: 0 },
      ArrowDown: { dRow: 1, dCol: 0 },
      ArrowLeft: { dRow: 0, dCol: -1 },
      ArrowRight: { dRow: 0, dCol: 1 },
    }
    const direction = arrowKeys[e.key]
    if (!direction) return

    const active = document.activeElement as HTMLElement | null
    if (!active) return
    const currentRow = Number(active.getAttribute('data-row'))
    const currentCol = Number(active.getAttribute('data-col'))
    if (isNaN(currentRow) || isNaN(currentCol)) return

    const nextRow = currentRow + direction.dRow
    const nextCol = currentCol + direction.dCol
    if (nextRow < 0 || nextRow >= BOARD_SIZE || nextCol < 0 || nextCol >= BOARD_SIZE) return

    e.preventDefault()
    e.currentTarget.querySelector<HTMLElement>(`[data-row="${nextRow}"][data-col="${nextCol}"]`)?.focus()
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-row][data-col]')
    if (!cell) return
    const row = Number(cell.dataset.row)
    const col = Number(cell.dataset.col)
    onSquareClick(row, col)
    if (board[row][col]) {
      e.currentTarget.setPointerCapture?.(e.pointerId)
      setDrag({
        row,
        col,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        size: cell.getBoundingClientRect().width,
        active: false,
      })
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const far = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD
    // Only a man the game accepted as selected can be carried.
    const active = drag.active || (far && isPieceSelected(drag.row, drag.col))
    if (active) setDrag({ ...drag, x: e.clientX, y: e.clientY, active })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    setDrag(null)
    if (!drag.active) return
    const target = squareAt(e.clientX, e.clientY)
    if (!target || same(target, drag.row, drag.col)) return
    if (isHighlighted(target.row, target.col)) {
      setDropped({ from: { row: drag.row, col: drag.col }, to: target })
    }
    onSquareClick(target.row, target.col)
  }

  const lastPath = lastMove ? movePath(lastMove) : []
  const carried = drag?.active ? board[drag.row][drag.col] : null

  return (
    <div className="arcade-board ck-frame">
      <div className="ck-ranks" aria-hidden="true">
        {RANK_LABELS.map(label => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div
        className="ck-grid"
        role="grid"
        aria-label="Checkers game board"
        tabIndex={-1}
        onKeyDown={handleGridKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        {board.map((row, rowIndex) => (
          <div key={rowIndex} role="row" className="contents">
            {row.map((cell, colIndex) => {
              const isTarget = !!anim && same(anim.to, rowIndex, colIndex)
              const captured = anim?.captured.find(c => same(c.at, rowIndex, colIndex)) ?? null
              return (
                <Cell
                  key={`${rowIndex}-${colIndex}`}
                  row={rowIndex}
                  col={colIndex}
                  piece={cell}
                  onActivate={onSquareClick}
                  isHighlighted={!disabled && isHighlighted(rowIndex, colIndex)}
                  isSelected={!disabled && isPieceSelected(rowIndex, colIndex)}
                  isDark={(rowIndex + colIndex) % 2 === 1}
                  disabled={disabled}
                  isLastMove={lastPath.some(p => same(p, rowIndex, colIndex))}
                  isHint={!!hintSquares?.some(sq => same(sq, rowIndex, colIndex))}
                  ring={
                    same(decisiveSquare, rowIndex, colIndex) ||
                    (!disabled && !!mustJumpFrom?.some(sq => same(sq, rowIndex, colIndex)))
                  }
                  travel={isTarget ? anim.travel : null}
                  animKey={anim?.key ?? 0}
                  captured={captured && !cell ? { piece: captured.piece, delayMs: captured.delayMs } : null}
                  crownDelayMs={isTarget ? anim.crownDelayMs : null}
                  isDragOrigin={!!drag?.active && drag.row === rowIndex && drag.col === colIndex}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="ck-files" aria-hidden="true">
        {FILE_LABELS.map(label => (
          <div key={label}>{label}</div>
        ))}
      </div>

      {drag?.active && carried && (
        <div
          className="ck-drag-piece"
          style={{ width: drag.size, height: drag.size, left: drag.x - drag.size / 2, top: drag.y - drag.size / 2 }}
        >
          <Piece piece={carried} />
        </div>
      )}
    </div>
  )
})
