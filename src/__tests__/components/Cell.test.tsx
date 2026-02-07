// Unit tests for Cell component

import { render, screen, fireEvent } from '@testing-library/react'
import { Cell } from '@/components/Cell'
import type { CellValue } from '@/types/checkers.types'

describe('Cell', () => {
  const defaultProps = {
    row: 3,
    col: 4,
    piece: null as CellValue,
    onClick: jest.fn(),
    isHighlighted: false,
    isSelected: false,
    isDark: true,
    disabled: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('dark/light squares', () => {
    it('renders dark square with wood-dark class', () => {
      const { container } = render(<Cell {...defaultProps} isDark={true} />)
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv.className).toContain('wood-dark')
      expect(cellDiv.className).not.toContain('wood-light')
    })

    it('renders light square with wood-light class', () => {
      const { container } = render(<Cell {...defaultProps} isDark={false} />)
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv.className).toContain('wood-light')
      expect(cellDiv.className).not.toContain('wood-dark')
    })
  })

  describe('click handling', () => {
    it('calls onClick with row and col when clicked and not disabled', () => {
      const onClick = jest.fn()
      render(<Cell {...defaultProps} onClick={onClick} row={2} col={5} />)

      const cell = screen.getByRole('gridcell')
      fireEvent.click(cell)

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick).toHaveBeenCalledWith(2, 5)
    })

    it('does not call onClick when disabled', () => {
      const onClick = jest.fn()
      render(<Cell {...defaultProps} onClick={onClick} disabled={true} />)

      const cell = screen.getByRole('gridcell')
      fireEvent.click(cell)

      expect(onClick).not.toHaveBeenCalled()
    })

    it('calls onClick on multiple clicks', () => {
      const onClick = jest.fn()
      render(<Cell {...defaultProps} onClick={onClick} row={1} col={2} />)

      const cell = screen.getByRole('gridcell')
      fireEvent.click(cell)
      fireEvent.click(cell)

      expect(onClick).toHaveBeenCalledTimes(2)
    })
  })

  describe('highlighted state', () => {
    it('applies cell-highlighted class for valid moves', () => {
      const { container } = render(<Cell {...defaultProps} isHighlighted={true} />)
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv.className).toContain('cell-highlighted')
    })

    it('shows valid-move-indicator dot when highlighted and no piece', () => {
      const { container } = render(
        <Cell {...defaultProps} isHighlighted={true} piece={null} />
      )
      const indicator = container.querySelector('.valid-move-indicator')
      expect(indicator).not.toBeNull()
    })

    it('does not show valid-move-indicator when not highlighted', () => {
      const { container } = render(
        <Cell {...defaultProps} isHighlighted={false} piece={null} />
      )
      const indicator = container.querySelector('.valid-move-indicator')
      expect(indicator).toBeNull()
    })

    it('does not show valid-move-indicator when highlighted but has a piece', () => {
      const piece: CellValue = { player: 1, type: 'regular' }
      const { container } = render(
        <Cell {...defaultProps} isHighlighted={true} piece={piece} />
      )
      const indicator = container.querySelector('.valid-move-indicator')
      expect(indicator).toBeNull()
    })
  })

  describe('selected state', () => {
    it('applies cell-selected class when isSelected and not highlighted', () => {
      const { container } = render(
        <Cell {...defaultProps} isSelected={true} isHighlighted={false} />
      )
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv.className).toContain('cell-selected')
    })

    it('highlighted takes visual priority over selected', () => {
      const { container } = render(
        <Cell {...defaultProps} isSelected={true} isHighlighted={true} />
      )
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv.className).toContain('cell-highlighted')
      // cell-selected should not appear when highlighted is active
      expect(cellDiv.className).not.toContain('cell-selected')
    })
  })

  describe('keyboard interaction', () => {
    it('handles Enter key press', () => {
      const onClick = jest.fn()
      render(<Cell {...defaultProps} onClick={onClick} row={4} col={3} />)

      const cell = screen.getByRole('gridcell')
      fireEvent.keyDown(cell, { key: 'Enter' })

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick).toHaveBeenCalledWith(4, 3)
    })

    it('handles Space key press', () => {
      const onClick = jest.fn()
      render(<Cell {...defaultProps} onClick={onClick} row={4} col={3} />)

      const cell = screen.getByRole('gridcell')
      fireEvent.keyDown(cell, { key: ' ' })

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick).toHaveBeenCalledWith(4, 3)
    })

    it('does not trigger on other keys', () => {
      const onClick = jest.fn()
      render(<Cell {...defaultProps} onClick={onClick} />)

      const cell = screen.getByRole('gridcell')
      fireEvent.keyDown(cell, { key: 'Escape' })
      fireEvent.keyDown(cell, { key: 'Tab' })
      fireEvent.keyDown(cell, { key: 'a' })

      expect(onClick).not.toHaveBeenCalled()
    })

    it('does not trigger keyboard action when disabled', () => {
      const onClick = jest.fn()
      render(<Cell {...defaultProps} onClick={onClick} disabled={true} />)

      const cell = screen.getByRole('gridcell')
      fireEvent.keyDown(cell, { key: 'Enter' })
      fireEvent.keyDown(cell, { key: ' ' })

      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('ARIA labels', () => {
    it('has correct ARIA label for empty dark square', () => {
      render(<Cell {...defaultProps} row={3} col={4} piece={null} />)
      const cell = screen.getByRole('gridcell')
      // col 4 = 'e', row 3 => rowNumber = 8-3 = 5, so "e5: empty"
      expect(cell).toHaveAttribute('aria-label', 'e5: empty')
    })

    it('has correct ARIA label for cell with red piece', () => {
      const piece: CellValue = { player: 1, type: 'regular' }
      render(<Cell {...defaultProps} row={5} col={2} piece={piece} />)
      const cell = screen.getByRole('gridcell')
      // col 2 = 'c', row 5 => rowNumber = 8-5 = 3, so "c3: Red piece"
      expect(cell).toHaveAttribute('aria-label', 'c3: Red piece')
    })

    it('has correct ARIA label for cell with black king', () => {
      const piece: CellValue = { player: 2, type: 'king' }
      render(<Cell {...defaultProps} row={0} col={1} piece={piece} />)
      const cell = screen.getByRole('gridcell')
      // col 1 = 'b', row 0 => rowNumber = 8, so "b8: Black king"
      expect(cell).toHaveAttribute('aria-label', 'b8: Black king')
    })

    it('has correct ARIA label for highlighted empty cell', () => {
      render(<Cell {...defaultProps} row={4} col={3} piece={null} isHighlighted={true} />)
      const cell = screen.getByRole('gridcell')
      // col 3 = 'd', row 4 => rowNumber = 4, so "d4: valid move destination"
      expect(cell).toHaveAttribute('aria-label', 'd4: valid move destination')
    })

    it('includes selected status in ARIA label when piece is selected', () => {
      const piece: CellValue = { player: 1, type: 'regular' }
      render(<Cell {...defaultProps} row={5} col={2} piece={piece} isSelected={true} />)
      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('aria-label', 'c3: Red piece, selected')
    })

    it('has correct aria-selected attribute', () => {
      render(<Cell {...defaultProps} isSelected={true} />)
      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('aria-selected', 'true')
    })

    it('has correct aria-disabled attribute when disabled', () => {
      render(<Cell {...defaultProps} disabled={true} />)
      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('tabIndex', () => {
    it('has tabIndex 0 for dark squares when not disabled', () => {
      render(<Cell {...defaultProps} isDark={true} disabled={false} />)
      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('tabindex', '0')
    })

    it('has tabIndex -1 for light squares', () => {
      render(<Cell {...defaultProps} isDark={false} disabled={false} />)
      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('tabindex', '-1')
    })

    it('has tabIndex -1 for disabled dark squares', () => {
      render(<Cell {...defaultProps} isDark={true} disabled={true} />)
      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('tabindex', '-1')
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
      const piece: CellValue = { player: 1, type: 'regular' }
      render(<Cell {...defaultProps} piece={piece} />)
      // Piece renders with role="img"
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    it('does not render Piece component when piece is null', () => {
      render(<Cell {...defaultProps} piece={null} />)
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('passes isSelected to Piece component', () => {
      const piece: CellValue = { player: 1, type: 'regular' }
      render(<Cell {...defaultProps} piece={piece} isSelected={true} />)
      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('aria-label', expect.stringContaining('selected'))
    })

    it('passes isBeingCaptured to Piece component', () => {
      const piece: CellValue = { player: 2, type: 'regular' }
      const { container } = render(
        <Cell {...defaultProps} piece={piece} isBeingCaptured={true} />
      )
      const pieceDiv = container.querySelector('[role="img"]')
      expect(pieceDiv).not.toBeNull()
      expect(pieceDiv!.className).toContain('animate-piece-capture')
    })

    it('passes isBeingPromoted to Piece component', () => {
      const piece: CellValue = { player: 1, type: 'king' }
      const { container } = render(
        <Cell {...defaultProps} piece={piece} isBeingPromoted={true} />
      )
      const pieceDiv = container.querySelector('[role="img"]')
      expect(pieceDiv).not.toBeNull()
      expect(pieceDiv!.className).toContain('animate-king-promotion')
    })
  })

  describe('last move indicators', () => {
    it('applies last move ring when lastMoveFrom is true and not selected/highlighted', () => {
      const { container } = render(
        <Cell {...defaultProps} lastMoveFrom={true} isSelected={false} isHighlighted={false} />
      )
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv.className).toContain('ring-amber-400/40')
    })

    it('applies last move ring when lastMoveTo is true and not selected/highlighted', () => {
      const { container } = render(
        <Cell {...defaultProps} lastMoveTo={true} isSelected={false} isHighlighted={false} />
      )
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv.className).toContain('ring-amber-400/40')
    })

    it('does not apply last move ring when isSelected is true', () => {
      const { container } = render(
        <Cell {...defaultProps} lastMoveFrom={true} isSelected={true} isHighlighted={false} />
      )
      const cellDiv = container.firstElementChild as HTMLElement
      expect(cellDiv.className).not.toContain('ring-amber-400/40')
    })
  })
})
