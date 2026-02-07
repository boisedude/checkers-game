// Unit tests for GameControls component

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameControls } from '@/components/GameControls'
import type { Difficulty, GameMode } from '@/types/checkers.types'

// Mock the Radix Select component since it relies on browser APIs not available in jsdom
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: {
    children: React.ReactNode
    value: string
    onValueChange: (value: string) => void
  }) => (
    <div data-testid="select-root" data-value={value}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, { onValueChange })
        }
        return child
      })}
    </div>
  ),
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <button data-testid="select-trigger" id={id}>
      {children}
    </button>
  ),
  SelectValue: () => <span data-testid="select-value" />,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option data-testid={`select-item-${value}`} value={value}>
      {children}
    </option>
  ),
}))

describe('GameControls', () => {
  const defaultProps = {
    difficulty: 'medium' as Difficulty,
    onDifficultyChange: jest.fn(),
    onNewGame: jest.fn(),
    onShowLeaderboard: jest.fn(),
    gameMode: 'pvc' as GameMode,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('difficulty selector', () => {
    it('renders difficulty selector in PvC mode', () => {
      render(<GameControls {...defaultProps} gameMode="pvc" />)
      expect(screen.getByText('Your Opponent:')).toBeInTheDocument()
      expect(screen.getByTestId('select-trigger')).toBeInTheDocument()
    })

    it('hides difficulty selector in PvP mode', () => {
      render(<GameControls {...defaultProps} gameMode="pvp" />)
      expect(screen.queryByText('Your Opponent:')).not.toBeInTheDocument()
      expect(screen.queryByTestId('select-trigger')).not.toBeInTheDocument()
    })

    it('renders all three difficulty options in PvC mode', () => {
      render(<GameControls {...defaultProps} gameMode="pvc" />)
      expect(screen.getByTestId('select-item-easy')).toBeInTheDocument()
      expect(screen.getByTestId('select-item-medium')).toBeInTheDocument()
      expect(screen.getByTestId('select-item-hard')).toBeInTheDocument()
    })

    it('shows correct difficulty option labels', () => {
      render(<GameControls {...defaultProps} gameMode="pvc" />)
      expect(screen.getByText('Bella - Playful Pup')).toBeInTheDocument()
      expect(screen.getByText('Coop - Casual Challenger')).toBeInTheDocument()
      expect(screen.getByText('Bentley - The Mastermind')).toBeInTheDocument()
    })
  })

  describe('New Game button', () => {
    it('renders New Game button', () => {
      render(<GameControls {...defaultProps} />)
      expect(screen.getByText('New Game')).toBeInTheDocument()
    })

    it('calls onNewGame when New Game button clicked', () => {
      const onNewGame = jest.fn()
      render(<GameControls {...defaultProps} onNewGame={onNewGame} />)

      fireEvent.click(screen.getByText('New Game'))
      expect(onNewGame).toHaveBeenCalledTimes(1)
    })

    it('disables New Game button when disabled prop is true', () => {
      render(<GameControls {...defaultProps} disabled={true} />)
      expect(screen.getByText('New Game')).toBeDisabled()
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
      expect(screen.getByText('Help')).toBeInTheDocument()
    })

    it('does not render Help button when onShowHelp is not provided', () => {
      render(<GameControls {...defaultProps} />)
      expect(screen.queryByText('Help')).not.toBeInTheDocument()
    })

    it('calls onShowHelp when Help button clicked', () => {
      const onShowHelp = jest.fn()
      render(<GameControls {...defaultProps} onShowHelp={onShowHelp} />)

      fireEvent.click(screen.getByText('Help'))
      expect(onShowHelp).toHaveBeenCalledTimes(1)
    })
  })

  describe('mode-specific rendering', () => {
    it('renders correctly in PvC mode with all controls', () => {
      render(
        <GameControls
          {...defaultProps}
          gameMode="pvc"
          onUndo={jest.fn()}
          canUndo={true}
          gameStatus="playing"
          onShowHelp={jest.fn()}
        />
      )
      expect(screen.getByText('Your Opponent:')).toBeInTheDocument()
      expect(screen.getByText('New Game')).toBeInTheDocument()
      expect(screen.getByText('Undo')).toBeInTheDocument()
      expect(screen.getByText('Stats')).toBeInTheDocument()
      expect(screen.getByText('Help')).toBeInTheDocument()
    })

    it('renders correctly in PvP mode without difficulty selector', () => {
      render(
        <GameControls
          {...defaultProps}
          gameMode="pvp"
          onUndo={jest.fn()}
          canUndo={true}
          gameStatus="playing"
        />
      )
      expect(screen.queryByText('Your Opponent:')).not.toBeInTheDocument()
      expect(screen.getByText('New Game')).toBeInTheDocument()
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
