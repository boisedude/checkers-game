// Unit tests for Cell component

import { render, screen, fireEvent } from '@testing-library/react'
import { Cell } from '@/components/Cell'
import type { CellValue } from '@/types/checkers.types'

describe('Cell', () => {
  const defaultProps = {
    row: 3,
    col: 4,
    piece: null as CellValue,
    onActivate: vi.fn(),
    isHighlighted: false,
    isSelected: false,
    isDark: true,
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('dark/light squares', () => {
    it('renders dark square with ck-dark class', () => {
      const { container } = render(<Cell {...defaultProps} isDark={true} />)
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv.className).toContain('ck-dark')
      expect(cellDiv.className).not.toContain('ck-light')
    })

    it('renders light square with ck-light class', () => {
      const { container } = render(<Cell {...defaultProps} isDark={false} />)
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv.className).toContain('ck-light')
      expect(cellDiv.className).not.toContain('ck-dark')
    })
  })

  describe('pointer input', () => {
    it('leaves clicks to the board, which handles pointer input', () => {
      const onActivate = vi.fn()
      render(<Cell {...defaultProps} onActivate={onActivate} row={2} col={5} />)
      fireEvent.click(screen.getByRole('gridcell'))
      expect(onActivate).not.toHaveBeenCalled()
    })

    it('shows a pointer cursor on a square with a piece', () => {
      const { container } = render(<Cell {...defaultProps} piece={{ player: 1, type: 'regular' }} />)
      expect((container.firstElementChild as HTMLElement).className).toContain('cursor-pointer')
    })

    it('shows no pointer cursor when disabled', () => {
      const { container } = render(
        <Cell {...defaultProps} piece={{ player: 1, type: 'regular' }} disabled={true} />
      )
      expect((container.firstElementChild as HTMLElement).className).not.toContain('cursor-pointer')
    })
  })

  describe('highlighted state', () => {
    it('shows valid-move-indicator dot when highlighted and no piece', () => {
      const { container } = render(<Cell {...defaultProps} isHighlighted={true} piece={null} />)
      expect(container.querySelector('.valid-move-indicator')).not.toBeNull()
    })

    it('does not show valid-move-indicator when not highlighted', () => {
      const { container } = render(<Cell {...defaultProps} isHighlighted={false} piece={null} />)
      expect(container.querySelector('.valid-move-indicator')).toBeNull()
    })

    it('does not show valid-move-indicator when highlighted but has a piece', () => {
      const piece: CellValue = { player: 1, type: 'regular' }
      const { container } = render(<Cell {...defaultProps} isHighlighted={true} piece={piece} />)
      expect(container.querySelector('.valid-move-indicator')).toBeNull()
    })
  })

  describe('selected state', () => {
    it('marks the selected square with a wash and aria-selected', () => {
      const { container } = render(<Cell {...defaultProps} isSelected={true} />)
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv).toHaveAttribute('aria-selected', 'true')
      expect(cellDiv.className).toContain('ck-selected')
    })

    it('has no selection wash when not selected', () => {
      const { container } = render(<Cell {...defaultProps} isSelected={false} />)
      expect((container.firstElementChild as HTMLElement).className).not.toContain('ck-selected')
    })
  })

  describe('keyboard interaction', () => {
    it('handles Enter key press', () => {
      const onActivate = vi.fn()
      render(<Cell {...defaultProps} onActivate={onActivate} row={4} col={3} />)
      fireEvent.keyDown(screen.getByRole('gridcell'), { key: 'Enter' })
      expect(onActivate).toHaveBeenCalledTimes(1)
      expect(onActivate).toHaveBeenCalledWith(4, 3)
    })

    it('handles Space key press', () => {
      const onActivate = vi.fn()
      render(<Cell {...defaultProps} onActivate={onActivate} row={4} col={3} />)
      fireEvent.keyDown(screen.getByRole('gridcell'), { key: ' ' })
      expect(onActivate).toHaveBeenCalledTimes(1)
      expect(onActivate).toHaveBeenCalledWith(4, 3)
    })

    it('does not trigger on other keys', () => {
      const onActivate = vi.fn()
      render(<Cell {...defaultProps} onActivate={onActivate} />)
      const cell = screen.getByRole('gridcell')
      fireEvent.keyDown(cell, { key: 'Escape' })
      fireEvent.keyDown(cell, { key: 'Tab' })
      fireEvent.keyDown(cell, { key: 'a' })
      expect(onActivate).not.toHaveBeenCalled()
    })

    it('does not trigger keyboard action when disabled', () => {
      const onActivate = vi.fn()
      render(<Cell {...defaultProps} onActivate={onActivate} disabled={true} />)
      const cell = screen.getByRole('gridcell')
      fireEvent.keyDown(cell, { key: 'Enter' })
      fireEvent.keyDown(cell, { key: ' ' })
      expect(onActivate).not.toHaveBeenCalled()
    })
  })

  describe('ARIA labels', () => {
    it('has correct ARIA label for empty dark square', () => {
      render(<Cell {...defaultProps} row={3} col={4} piece={null} />)
      // col 4 = 'e', row 3 => rowNumber = 8-3 = 5, so "e5: empty"
      expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'e5: empty')
    })

    it('has correct ARIA label for cell with red piece', () => {
      render(<Cell {...defaultProps} row={5} col={2} piece={{ player: 1, type: 'regular' }} />)
      expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'c3: Red piece')
    })

    it('has correct ARIA label for cell with black king', () => {
      render(<Cell {...defaultProps} row={0} col={1} piece={{ player: 2, type: 'king' }} />)
      expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'b8: Black king')
    })

    it('has correct ARIA label for highlighted empty cell', () => {
      render(<Cell {...defaultProps} row={4} col={3} piece={null} isHighlighted={true} />)
      expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'd4: valid move destination')
    })

    it('includes selected status in ARIA label when piece is selected', () => {
      render(<Cell {...defaultProps} row={5} col={2} piece={{ player: 1, type: 'regular' }} isSelected={true} />)
      expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'c3: Red piece, selected')
    })

    it('says a ringed man must jump', () => {
      render(<Cell {...defaultProps} row={5} col={2} piece={{ player: 1, type: 'regular' }} ring={true} />)
      expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'c3: Red piece, must jump')
    })

    it('has correct aria-selected attribute', () => {
      render(<Cell {...defaultProps} isSelected={true} />)
      expect(screen.getByRole('gridcell')).toHaveAttribute('aria-selected', 'true')
    })

    it('has correct aria-disabled attribute when disabled', () => {
      render(<Cell {...defaultProps} disabled={true} />)
      expect(screen.getByRole('gridcell')).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('tabIndex', () => {
    it('has tabIndex 0 for dark squares when not disabled', () => {
      render(<Cell {...defaultProps} isDark={true} disabled={false} />)
      expect(screen.getByRole('gridcell')).toHaveAttribute('tabindex', '0')
    })

    it('has tabIndex -1 for light squares', () => {
      render(<Cell {...defaultProps} isDark={false} disabled={false} />)
      expect(screen.getByRole('gridcell')).toHaveAttribute('tabindex', '-1')
    })

    it('has tabIndex -1 for disabled dark squares', () => {
      render(<Cell {...defaultProps} isDark={true} disabled={true} />)
      expect(screen.getByRole('gridcell')).toHaveAttribute('tabindex', '-1')
    })
  })

  describe('data attributes', () => {
    it('sets data-row and data-col attributes', () => {
      render(<Cell {...defaultProps} row={6} col={7} />)
      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('data-row', '6')
      expect(cell).toHaveAttribute('data-col', '7')
    })
  })

  describe('piece rendering', () => {
    it('renders Piece component when piece is present', () => {
      render(<Cell {...defaultProps} piece={{ player: 1, type: 'regular' }} />)
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    it('does not render Piece component when piece is null', () => {
      render(<Cell {...defaultProps} piece={null} />)
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('passes isSelected to Piece component', () => {
      render(<Cell {...defaultProps} piece={{ player: 1, type: 'regular' }} isSelected={true} />)
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('selected'))
    })

    it('shows a jumped man fading on an emptied square, hidden from assistive tech', () => {
      const { container } = render(
        <Cell {...defaultProps} piece={null} captured={{ piece: { player: 2, type: 'regular' }, delayMs: 120 }} />
      )
      const ghost = container.querySelector('.ck-captured') as HTMLElement
      expect(ghost).not.toBeNull()
      expect(ghost).toHaveAttribute('aria-hidden', 'true')
      expect(ghost.style.animationDelay).toBe('120ms')
    })

    it('settles the crown on a man crowned by the move being shown', () => {
      const { container } = render(
        <Cell {...defaultProps} piece={{ player: 1, type: 'king' }} crownDelayMs={200} />
      )
      expect(container.querySelector('.ck-crowning')).not.toBeNull()
    })

    it('wraps a travelling man so its slide can play', () => {
      const { container } = render(
        <Cell
          {...defaultProps}
          piece={{ player: 1, type: 'regular' }}
          travel={{ path: [{ dx: -1, dy: 1 }, { dx: 0, dy: 0 }], isJump: false, stepMs: 200 }}
          animKey={1}
        />
      )
      expect(container.querySelector('.ck-travelling')).not.toBeNull()
    })
  })

  describe('last move and hint marks', () => {
    it('washes a square of the last move', () => {
      const { container } = render(<Cell {...defaultProps} isLastMove={true} />)
      expect((container.firstElementChild as HTMLElement).className).toContain('ck-last')
    })

    it('has no last-move wash otherwise', () => {
      const { container } = render(<Cell {...defaultProps} isLastMove={false} />)
      expect((container.firstElementChild as HTMLElement).className).not.toContain('ck-last')
    })

    it('rings a hint square with the shared hint mark', () => {
      const { container } = render(<Cell {...defaultProps} isHint={true} />)
      expect(container.querySelector('.arcade-hint')).not.toBeNull()
      expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'e5: empty, hint')
    })
  })
})
