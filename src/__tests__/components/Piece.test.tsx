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
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Red piece')
    })

    it('renders black piece with correct ARIA label', () => {
      render(<Piece piece={blackRegular} isSelected={false} />)
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Black piece')
    })

    it('renders red king with correct ARIA label', () => {
      render(<Piece piece={redKing} isSelected={false} />)
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Red king')
    })

    it('renders black king with correct ARIA label', () => {
      render(<Piece piece={blackKing} isSelected={false} />)
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Black king')
    })

    it('is drawn as an SVG, not a glyph', () => {
      const { container } = render(<Piece piece={redRegular} />)
      expect(container.firstElementChild?.tagName.toLowerCase()).toBe('svg')
      expect(container.textContent).toBe('')
    })

    it('gives each piece its own gradient ids', () => {
      const { container } = render(
        <>
          <Piece piece={redRegular} />
          <Piece piece={blackRegular} />
        </>
      )
      const ids = [...container.querySelectorAll('radialGradient')].map(g => g.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('king', () => {
    it('shows an inlaid crown on a king', () => {
      const { container } = render(<Piece piece={redKing} isSelected={false} />)
      expect(container.querySelector('.ck-crown')).not.toBeNull()
    })

    it('does not show a crown on a man', () => {
      const { container } = render(<Piece piece={redRegular} isSelected={false} />)
      expect(container.querySelector('.ck-crown')).toBeNull()
    })

    it('stacks a second disc under a king', () => {
      const { container } = render(<Piece piece={blackKing} isSelected={false} />)
      expect(container.querySelector('.ck-under')).not.toBeNull()
      expect(container.firstElementChild).toHaveAttribute('data-king', 'true')
    })

    it('has no second disc under a man', () => {
      const { container } = render(<Piece piece={redRegular} isSelected={false} />)
      expect(container.querySelector('.ck-under')).toBeNull()
      expect(container.firstElementChild).not.toHaveAttribute('data-king')
    })
  })

  describe('selected state', () => {
    it('includes selected status in ARIA label', () => {
      render(<Piece piece={redRegular} isSelected={true} />)
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Red piece, selected')
    })

    it('does not include selected status in ARIA label when not selected', () => {
      render(<Piece piece={redRegular} isSelected={false} />)
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Red piece')
    })
  })

  describe('ring', () => {
    it('draws a brass ring when asked', () => {
      const { container } = render(<Piece piece={redRegular} ring={true} />)
      expect(container.querySelector('.ck-ring')).not.toBeNull()
    })

    it('draws no ring by default', () => {
      const { container } = render(<Piece piece={redRegular} />)
      expect(container.querySelector('.ck-ring')).toBeNull()
    })
  })

  describe('crowning', () => {
    it('settles a newly crowned king after the given delay', () => {
      const { container } = render(<Piece piece={redKing} crownDelayMs={240} />)
      const svg = container.firstElementChild as SVGElement
      expect(svg.getAttribute('class')).toContain('ck-crowning')
      expect(svg.style.getPropertyValue('--crown-delay')).toBe('240ms')
    })

    it('does not animate a king that was already crowned', () => {
      const { container } = render(<Piece piece={redKing} />)
      expect(container.firstElementChild?.getAttribute('class')).not.toContain('ck-crowning')
    })

    it('ignores a crown delay on a man', () => {
      const { container } = render(<Piece piece={redRegular} crownDelayMs={240} />)
      expect(container.firstElementChild?.getAttribute('class')).not.toContain('ck-crowning')
    })
  })

  describe('player colours', () => {
    it('marks player 1 pieces', () => {
      const { container } = render(<Piece piece={redRegular} />)
      expect(container.firstElementChild).toHaveAttribute('data-player', '1')
    })

    it('marks player 2 pieces', () => {
      const { container } = render(<Piece piece={blackRegular} />)
      expect(container.firstElementChild).toHaveAttribute('data-player', '2')
    })

    it('uses different face colours for the two sides', () => {
      const { container: red } = render(<Piece piece={redRegular} />)
      const { container: black } = render(<Piece piece={blackRegular} />)
      const stop = (c: HTMLElement) => c.querySelector('radialGradient stop')?.getAttribute('stop-color')
      expect(stop(red)).not.toBe(stop(black))
    })
  })
})
