// Unit tests for GameControls component

import { render, screen, fireEvent } from '@testing-library/react'
import { GameControls } from '@/components/GameControls'

describe('GameControls', () => {
  const defaultProps = {
    onNewGame: jest.fn(),
    onShowLeaderboard: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('New Game button', () => {
    it('renders New Game button', () => {
      render(<GameControls {...defaultProps} />)
      expect(screen.getByText('New game')).toBeInTheDocument()
    })

    it('calls onNewGame when New Game button clicked', () => {
      const onNewGame = jest.fn()
      render(<GameControls {...defaultProps} onNewGame={onNewGame} />)

      fireEvent.click(screen.getByText('New game'))
      expect(onNewGame).toHaveBeenCalledTimes(1)
    })

    it('disables New Game button when disabled prop is true', () => {
      render(<GameControls {...defaultProps} disabled={true} />)
      expect(screen.getByText('New game')).toBeDisabled()
    })
  })

  describe('Stats button', () => {
    it('renders Stats button', () => {
      render(<GameControls {...defaultProps} />)
      expect(screen.getByText('Stats')).toBeInTheDocument()
    })

    it('calls onShowLeaderboard when Stats button clicked', () => {
      const onShowLeaderboard = jest.fn()
      render(<GameControls {...defaultProps} onShowLeaderboard={onShowLeaderboard} />)

      fireEvent.click(screen.getByText('Stats'))
      expect(onShowLeaderboard).toHaveBeenCalledTimes(1)
    })

    it('disables Stats button when disabled prop is true', () => {
      render(<GameControls {...defaultProps} disabled={true} />)
      expect(screen.getByText('Stats')).toBeDisabled()
    })
  })

  describe('Undo button', () => {
    it('renders undo button when gameStatus is playing and onUndo is provided', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={jest.fn()}
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
          onUndo={jest.fn()}
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
          onUndo={jest.fn()}
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
          onUndo={jest.fn()}
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
          onUndo={jest.fn()}
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
          onUndo={jest.fn()}
          canUndo={true}
          gameStatus="playing"
          disabled={false}
        />
      )
      const undoButton = screen.getByText('Undo').closest('button')
      expect(undoButton).not.toBeDisabled()
    })

    it('calls onUndo when undo button is clicked', () => {
      const onUndo = jest.fn()
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
          onUndo={jest.fn()}
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
          onUndo={jest.fn()}
          canUndo={true}
          gameStatus="playing"
        />
      )
      const undoButton = screen.getByText('Undo').closest('button')
      expect(undoButton).toHaveAttribute('aria-label', 'Undo last move (U)')
    })
  })

  describe('Help button', () => {
    it('renders Help button when onShowHelp is provided', () => {
      render(<GameControls {...defaultProps} onShowHelp={jest.fn()} />)
      expect(screen.getByText('How to play')).toBeInTheDocument()
    })

    it('does not render Help button when onShowHelp is not provided', () => {
      render(<GameControls {...defaultProps} />)
      expect(screen.queryByText('How to play')).not.toBeInTheDocument()
    })

    it('calls onShowHelp when Help button clicked', () => {
      const onShowHelp = jest.fn()
      render(<GameControls {...defaultProps} onShowHelp={onShowHelp} />)

      fireEvent.click(screen.getByText('How to play'))
      expect(onShowHelp).toHaveBeenCalledTimes(1)
    })
  })

  describe('mode-specific rendering', () => {
    it('renders correctly in PvC mode with all controls', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={jest.fn()}
          canUndo={true}
          gameStatus="playing"
          onShowHelp={jest.fn()}
        />
      )
      expect(screen.getByText('New game')).toBeInTheDocument()
      expect(screen.getByText('Undo')).toBeInTheDocument()
      expect(screen.getByText('Stats')).toBeInTheDocument()
      expect(screen.getByText('How to play')).toBeInTheDocument()
    })

    it('renders correctly with a minimal control set', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={jest.fn()}
          canUndo={true}
          gameStatus="playing"
        />
      )
      expect(screen.getByText('New game')).toBeInTheDocument()
      expect(screen.getByText('Undo')).toBeInTheDocument()
      expect(screen.getByText('Stats')).toBeInTheDocument()
    })
  })

  describe('default prop values', () => {
    it('defaults gameStatus to playing', () => {
      render(
        <GameControls
          {...defaultProps}
          onUndo={jest.fn()}
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
          onUndo={jest.fn()}
          gameStatus="playing"
          // canUndo not provided, defaults to false
        />
      )
      const undoButton = screen.getByText('Undo').closest('button')
      expect(undoButton).toBeDisabled()
    })
  })
})
