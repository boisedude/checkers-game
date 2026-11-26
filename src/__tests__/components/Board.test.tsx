// Unit tests for Board: pointer input and how a new move is shown

import { render, screen, fireEvent } from '@testing-library/react'
import { Board } from '@/components/Board'
import { createInitialBoard } from '@/lib/checkersRules'
import type { Board as BoardType, Move } from '@/types/checkers.types'

function emptyBoard(): BoardType {
  return Array.from({ length: 8 }, () => Array(8).fill(null))
}

const baseProps = {
  onSquareClick: vi.fn(),
  isHighlighted: () => false,
  isPieceSelected: () => false,
}

describe('Board', () => {
  beforeEach(() => vi.clearAllMocks())

  it('turns a press on a square into a square activation', () => {
    const onSquareClick = vi.fn()
    render(<Board {...baseProps} board={createInitialBoard()} moveCount={0} onSquareClick={onSquareClick} />)
    fireEvent.pointerDown(screen.getByRole('gridcell', { name: /^c3:/ }), { button: 0, pointerType: 'mouse' })
    expect(onSquareClick).toHaveBeenCalledWith(5, 2)
  })

  it('ignores presses while disabled', () => {
    const onSquareClick = vi.fn()
    render(<Board {...baseProps} board={createInitialBoard()} moveCount={0} onSquareClick={onSquareClick} disabled />)
    fireEvent.pointerDown(screen.getByRole('gridcell', { name: /^c3:/ }), { button: 0, pointerType: 'mouse' })
    expect(onSquareClick).not.toHaveBeenCalled()
  })

  it('puts coordinates in the frame', () => {
    const { container } = render(<Board {...baseProps} board={createInitialBoard()} moveCount={0} />)
    expect(container.querySelector('.ck-files')?.textContent).toBe('abcdefgh')
    expect(container.querySelector('.ck-ranks')?.textContent).toBe('87654321')
  })

  it('slides the man of a new move and fades the man it jumped', () => {
    const before = emptyBoard()
    before[5][2] = { player: 1, type: 'regular' }
    before[4][3] = { player: 2, type: 'regular' }
    const after = emptyBoard()
    after[3][4] = { player: 1, type: 'regular' }
    const move: Move = {
      from: { row: 5, col: 2 },
      to: { row: 3, col: 4 },
      jumps: [{ from: { row: 5, col: 2 }, to: { row: 3, col: 4 }, captured: { row: 4, col: 3 } }],
      player: 1,
      becameKing: false,
    }
    const { container, rerender } = render(<Board {...baseProps} board={before} moveCount={0} />)
    expect(container.querySelector('.ck-travelling')).toBeNull()
    rerender(<Board {...baseProps} board={after} moveCount={1} lastMove={move} />)
    const mover = container.querySelector('[data-row="3"][data-col="4"] .ck-travelling')
    expect(mover).not.toBeNull()
    expect(container.querySelector('[data-row="4"][data-col="3"] .ck-captured')).not.toBeNull()
    // Every square of the move's path carries the last-move wash.
    expect(container.querySelectorAll('.ck-last')).toHaveLength(2)
  })

  it('does not animate when moves are taken back', () => {
    const board = createInitialBoard()
    const { container, rerender } = render(<Board {...baseProps} board={board} moveCount={2} />)
    rerender(<Board {...baseProps} board={createInitialBoard()} moveCount={0} />)
    expect(container.querySelector('.ck-travelling')).toBeNull()
    expect(container.querySelector('.ck-captured')).toBeNull()
  })

  it('rings the men that must jump, and only on an enabled board', () => {
    const board = createInitialBoard()
    const { container, rerender } = render(
      <Board {...baseProps} board={board} moveCount={0} mustJumpFrom={[{ row: 5, col: 2 }]} />
    )
    expect(container.querySelectorAll('.ck-ring')).toHaveLength(1)
    rerender(<Board {...baseProps} board={board} moveCount={0} mustJumpFrom={[{ row: 5, col: 2 }]} disabled />)
    expect(container.querySelectorAll('.ck-ring')).toHaveLength(0)
  })
})
