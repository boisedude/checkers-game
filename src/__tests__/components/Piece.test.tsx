// Unit tests for Piece component

import { render, screen } from '@testing-library/react'
import { Piece } from '@/components/Piece'
import type { Piece as PieceType } from '@/types/checkers.types'

describe('Piece', () => {
  const redRegular: PieceType = { player: 1, type: 'regular' }
  const blackRegular: PieceType = { player: 2, type: 'regular' }
  const redKing: PieceType = { player: 1, type: 'king' }
  const blackKing: PieceType = { player: 2, type: 'king' }

  describe('rendering', () => {
    it('renders red piece with correct ARIA label', () => {
      render(<Piece piece={redRegular} isSelected={false} />)
      const piece = screen.getByRole('img')
      expect(piece).toHaveAttribute('aria-label', 'Red piece')
    })

    it('renders black piece with correct ARIA label', () => {
      render(<Piece piece={blackRegular} isSelected={false} />)
      const piece = screen.getByRole('img')
      expect(piece).toHaveAttribute('aria-label', 'Black piece')
    })

    it('renders red king with correct ARIA label', () => {
      render(<Piece piece={redKing} isSelected={false} />)
      const piece = screen.getByRole('img')
      expect(piece).toHaveAttribute('aria-label', 'Red king')
    })

    it('renders black king with correct ARIA label', () => {
      render(<Piece piece={blackKing} isSelected={false} />)
      const piece = screen.getByRole('img')
      expect(piece).toHaveAttribute('aria-label', 'Black king')
    })
  })

  describe('king crown', () => {
    it('shows king crown SVG when piece type is king', () => {
      const { container } = render(<Piece piece={redKing} isSelected={false} />)
      // King pieces have an SVG crown element
      const svgElements = container.querySelectorAll('svg')
      expect(svgElements.length).toBeGreaterThan(0)
    })

    it('does not show king crown for regular pieces', () => {
      const { container } = render(<Piece piece={redRegular} isSelected={false} />)
      const svgElements = container.querySelectorAll('svg')
      expect(svgElements.length).toBe(0)
    })

    it('shows stacked piece layers for king pieces', () => {
      const { container } = render(<Piece piece={blackKing} isSelected={false} />)
      // King pieces have extra div layers for the stacked effect (aria-hidden="true")
      const hiddenDivs = container.querySelectorAll('[aria-hidden="true"]')
      // Crown div + 2 stacked layers = 3 aria-hidden elements
      expect(hiddenDivs.length).toBe(3)
    })

    it('does not show stacked layers for regular pieces', () => {
      const { container } = render(<Piece piece={redRegular} isSelected={false} />)
      const hiddenDivs = container.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenDivs.length).toBe(0)
    })
  })

  describe('selected state', () => {
    it('applies selected classes when isSelected is true', () => {
      const { container } = render(<Piece piece={redRegular} isSelected={true} />)
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).toContain('piece-selected')
      expect(pieceDiv.className).toContain('animate-selected-glow')
    })

    it('does not apply selected classes when isSelected is false', () => {
      const { container } = render(<Piece piece={redRegular} isSelected={false} />)
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).not.toContain('piece-selected')
      expect(pieceDiv.className).not.toContain('animate-selected-glow')
    })

    it('includes selected status in ARIA label', () => {
      render(<Piece piece={redRegular} isSelected={true} />)
      const piece = screen.getByRole('img')
      expect(piece).toHaveAttribute('aria-label', 'Red piece, selected')
    })

    it('does not include selected status in ARIA label when not selected', () => {
      render(<Piece piece={redRegular} isSelected={false} />)
      const piece = screen.getByRole('img')
      expect(piece).toHaveAttribute('aria-label', 'Red piece')
    })
  })

  describe('capture animation', () => {
    it('applies capture animation class when isBeingCaptured is true', () => {
      const { container } = render(
        <Piece piece={redRegular} isSelected={false} isBeingCaptured={true} />
      )
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).toContain('animate-piece-capture')
    })

    it('does not apply capture animation class when isBeingCaptured is false', () => {
      const { container } = render(
        <Piece piece={redRegular} isSelected={false} isBeingCaptured={false} />
      )
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).not.toContain('animate-piece-capture')
    })
  })

  describe('promotion animation', () => {
    it('applies promotion animation class when isBeingPromoted is true', () => {
      const { container } = render(
        <Piece piece={redKing} isSelected={false} isBeingPromoted={true} />
      )
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).toContain('animate-king-promotion')
    })

    it('applies crown appear animation when isBeingPromoted on king', () => {
      const { container } = render(
        <Piece piece={redKing} isSelected={false} isBeingPromoted={true} />
      )
      const crownDiv = container.querySelector('.king-crown')
      expect(crownDiv).not.toBeNull()
      expect(crownDiv!.className).toContain('animate-crown-appear')
    })

    it('does not apply promotion animation class when isBeingPromoted is false', () => {
      const { container } = render(
        <Piece piece={redKing} isSelected={false} isBeingPromoted={false} />
      )
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).not.toContain('animate-king-promotion')
    })
  })

  describe('animation priority', () => {
    it('capture animation takes priority over promotion animation', () => {
      const { container } = render(
        <Piece
          piece={redKing}
          isSelected={false}
          isBeingCaptured={true}
          isBeingPromoted={true}
        />
      )
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).toContain('animate-piece-capture')
      expect(pieceDiv.className).not.toContain('animate-king-promotion')
    })

    it('applies slide animation class when isAnimating without jump', () => {
      const { container } = render(
        <Piece piece={redRegular} isSelected={false} isAnimating={true} isJumpAnimation={false} />
      )
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).toContain('animate-piece-slide')
    })

    it('applies jump animation class when isAnimating with jump', () => {
      const { container } = render(
        <Piece piece={redRegular} isSelected={false} isAnimating={true} isJumpAnimation={true} />
      )
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).toContain('animate-piece-jump')
    })
  })

  describe('player color classes', () => {
    it('applies piece-red class for player 1', () => {
      const { container } = render(<Piece piece={redRegular} isSelected={false} />)
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).toContain('piece-red')
      expect(pieceDiv.className).not.toContain('piece-black')
    })

    it('applies piece-black class for player 2', () => {
      const { container } = render(<Piece piece={blackRegular} isSelected={false} />)
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).toContain('piece-black')
      expect(pieceDiv.className).not.toContain('piece-red')
    })

    it('applies piece-king class for king pieces', () => {
      const { container } = render(<Piece piece={redKing} isSelected={false} />)
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).toContain('piece-king')
    })

    it('does not apply piece-king class for regular pieces', () => {
      const { container } = render(<Piece piece={redRegular} isSelected={false} />)
      const pieceDiv = container.firstElementChild as HTMLElement
      expect(pieceDiv.className).not.toContain('piece-king')
    })
  })
})
