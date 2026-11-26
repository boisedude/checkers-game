// Unit tests for GameControls component

import { render, screen, fireEvent } from '@testing-library/react'
import { GameControls } from '@/components/GameControls'

function openMore() {
  fireEvent.click(screen.getByRole('button', { name: 'More' }))
}

describe('GameControls', () => {
  const defaultProps = {
    onNewGame: vi.fn(),
    onShowLeaderboard: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('New Game button', () => {
    it('renders New Game button', () => {
      render(<GameControls {...defaultProps} />)
      expect(screen.getByText('New game')).toBeInTheDocument()
    })

    it('calls onNewGame when New Game button clicked', () => {
      const onNewGame = vi.fn()
      render(<GameControls {...defaultProps} onNewGame={onNewGame} />)

      fireEvent.click(screen.getByText('New game'))
      expect(onNewGame).toHaveBeenCalledTimes(1)
    })

    it('disables New Game button when disabled prop is true', () => {
      render(<GameControls {...defaultProps} disabled={true} />)
      expect(screen.getByText('New game')).toBeDisabled()
    })
  })

  describe('More menu', () => {
    it('keeps Stats in the More menu, not the row', () => {
      render(<GameControls {...defaultProps} />)
      expect(screen.queryByText('Stats')).not.toBeInTheDocument()
      openMore()
      expect(screen.getByRole('menuitem', { name: 'Stats' })).toBeInTheDocument()
    })

    it('calls onShowLeaderboard when Stats is chosen', () => {
      const onShowLeaderboard = vi.fn()
      render(<GameControls {...defaultProps} onShowLeaderboard={onShowLeaderboard} />)

      openMore()
      fireEvent.click(screen.getByRole('menuitem', { name: 'Stats' }))
      expect(onShowLeaderboard).toHaveBeenCalledTimes(1)
    })

    it('disables the More menu when disabled prop is true', () => {
      render(<GameControls {...defaultProps} disabled={true} />)
      expect(screen.getByRole('button', { name: 'More' })).toBeDisabled()
    })

    it('lists every other action in order', () => {
      render(
        <GameControls
          {...defaultProps}
          onShowHelp={vi.fn()}
          onShowAchievements={vi.fn()}
          onShowHistory={vi.fn()}
          onReturnToSetup={vi.fn()}
        />
      )
      openMore()
      expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual([
        'How to play',
        'Stats',
        'Achievements',
        'Game history',
        'Change mode',
      ])
    })
  })

  describe('Undo button', () => {
    it('renders undo button when gameStatus is playing and onUndo is provided', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={true}
          gameStatus="playing"
        />
      )
      expect(screen.getByText('Undo')).toBeInTheDocument()
    })

    it('does not render undo button when onUndo is not provided', () => {
      render(<GameControls {...defaultProps} gameStatus="playing" />)
      expect(screen.queryByText('Undo')).not.toBeInTheDocument()
    })

    it('does not render undo button when gameStatus is not playing', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={true}
          gameStatus="won"
        />
      )
      expect(screen.queryByText('Undo')).not.toBeInTheDocument()
    })

    it('does not render undo button when gameStatus is setup', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={true}
          gameStatus="setup"
        />
      )
      expect(screen.queryByText('Undo')).not.toBeInTheDocument()
    })

    it('does not render undo button when gameStatus is draw', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={true}
          gameStatus="draw"
        />
      )
      expect(screen.queryByText('Undo')).not.toBeInTheDocument()
    })

    it('disables undo button when canUndo is false', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={false}
          gameStatus="playing"
        />
      )
      const undoButton = screen.getByText('Undo').closest('button')
      expect(undoButton).toBeDisabled()
    })

    it('enables undo button when canUndo is true', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={true}
          gameStatus="playing"
          disabled={false}
        />
      )
      const undoButton = screen.getByText('Undo').closest('button')
      expect(undoButton).not.toBeDisabled()
    })

    it('calls onUndo when undo button is clicked', () => {
      const onUndo = vi.fn()
      render(
        <GameControls
          {...defaultProps}
          onUndo={onUndo}
          canUndo={true}
          gameStatus="playing"
        />
      )

      fireEvent.click(screen.getByText('Undo'))
      expect(onUndo).toHaveBeenCalledTimes(1)
    })

    it('disables undo button when disabled prop is true even if canUndo is true', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={true}
          gameStatus="playing"
          disabled={true}
        />
      )
      const undoButton = screen.getByText('Undo').closest('button')
      expect(undoButton).toBeDisabled()
    })

    it('has correct aria-label for undo button', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={true}
          gameStatus="playing"
        />
      )
      const undoButton = screen.getByText('Undo').closest('button')
      expect(undoButton).toHaveAttribute('aria-label', 'Undo last move (U)')
    })
  })

  describe('How to play', () => {
    it('is in the More menu when onShowHelp is provided', () => {
      render(<GameControls {...defaultProps} onShowHelp={vi.fn()} />)
      openMore()
      expect(screen.getByRole('menuitem', { name: 'How to play' })).toBeInTheDocument()
    })

    it('is absent when onShowHelp is not provided', () => {
      render(<GameControls {...defaultProps} />)
      openMore()
      expect(screen.queryByText('How to play')).not.toBeInTheDocument()
    })

    it('calls onShowHelp when chosen', () => {
      const onShowHelp = vi.fn()
      render(<GameControls {...defaultProps} onShowHelp={onShowHelp} />)

      openMore()
      fireEvent.click(screen.getByRole('menuitem', { name: 'How to play' }))
      expect(onShowHelp).toHaveBeenCalledTimes(1)
    })
  })

  describe('mode-specific rendering', () => {
    it('renders correctly in PvC mode with all controls', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={true}
          gameStatus="playing"
          onShowHelp={vi.fn()}
        />
      )
      expect(screen.getByText('New game')).toBeInTheDocument()
      expect(screen.getByText('Undo')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
    })

    it('shows Hint only when a hint handler is given', () => {
      const { rerender } = render(<GameControls {...defaultProps} gameStatus="playing" />)
      expect(screen.queryByText('Hint')).not.toBeInTheDocument()
      rerender(<GameControls {...defaultProps} gameStatus="playing" onHint={vi.fn()} canHint={true} />)
      expect(screen.getByText('Hint')).not.toBeDisabled()
    })

    it('renders correctly with a minimal control set', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={true}
          gameStatus="playing"
        />
      )
      expect(screen.getByText('New game')).toBeInTheDocument()
      expect(screen.getByText('Undo')).toBeInTheDocument()
      expect(screen.getAllByRole('button')).toHaveLength(3)
    })
  })

  describe('default prop values', () => {
    it('defaults gameStatus to playing', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          canUndo={true}
          // gameStatus not provided, should default to 'playing'
        />
      )
      // Undo should be visible since default gameStatus is 'playing'
      expect(screen.getByText('Undo')).toBeInTheDocument()
    })

    it('defaults canUndo to false', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={vi.fn()}
          gameStatus="playing"
          // canUndo not provided, defaults to false
        />
      )
      const undoButton = screen.getByText('Undo').closest('button')
      expect(undoButton).toBeDisabled()
    })
  })
})
