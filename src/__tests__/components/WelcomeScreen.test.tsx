// Unit tests for WelcomeScreen component

import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import type { Difficulty, GameMode } from '@/types/checkers.types'

describe('WelcomeScreen', () => {
  const defaultProps = {
    mode: 'pvc' as GameMode,
    difficulty: 'medium' as Difficulty,
    onModeChange: jest.fn(),
    onDifficultyChange: jest.fn(),
    onStartGame: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('title and layout', () => {
    it('renders the Checkers title', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('Checkers')).toBeInTheDocument()
    })

    it('renders arcade subtitle', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText("at Coop's Arcade")).toBeInTheDocument()
    })
  })

  describe('mode toggle buttons', () => {
    it('renders vs AI button', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('vs AI')).toBeInTheDocument()
    })

    it('renders vs Player button', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('vs Player')).toBeInTheDocument()
    })

    it('calls onModeChange with pvc when vs AI button clicked', () => {
      const onModeChange = jest.fn()
      render(<WelcomeScreen {...defaultProps} onModeChange={onModeChange} />)

      fireEvent.click(screen.getByText('vs AI'))
      expect(onModeChange).toHaveBeenCalledWith('pvc')
    })

    it('calls onModeChange with pvp when vs Player button clicked', () => {
      const onModeChange = jest.fn()
      render(<WelcomeScreen {...defaultProps} onModeChange={onModeChange} />)

      fireEvent.click(screen.getByText('vs Player'))
      expect(onModeChange).toHaveBeenCalledWith('pvp')
    })
  })

  describe('PvC mode (vs AI)', () => {
    it('shows Choose Your Opponent heading in PvC mode', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvc" />)
      expect(screen.getByText('Choose Your Opponent')).toBeInTheDocument()
    })

    it('shows all three AI opponent cards', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvc" />)
      expect(screen.getByText('Bella')).toBeInTheDocument()
      expect(screen.getByText('Coop')).toBeInTheDocument()
      expect(screen.getByText('Bentley')).toBeInTheDocument()
    })

    it('shows difficulty labels on opponent cards', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvc" />)
      expect(screen.getByText('easy')).toBeInTheDocument()
      expect(screen.getByText('medium')).toBeInTheDocument()
      expect(screen.getByText('hard')).toBeInTheDocument()
    })

    it('shows avatar images for each character', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvc" />)
      expect(screen.getByAltText('Bella avatar')).toBeInTheDocument()
      expect(screen.getByAltText('Coop avatar')).toBeInTheDocument()
      expect(screen.getByAltText('Bentley avatar')).toBeInTheDocument()
    })

    it('calls onDifficultyChange when clicking Bella card', () => {
      const onDifficultyChange = jest.fn()
      render(
        <WelcomeScreen {...defaultProps} onDifficultyChange={onDifficultyChange} mode="pvc" />
      )

      fireEvent.click(screen.getByText('Bella'))
      expect(onDifficultyChange).toHaveBeenCalledWith('easy')
    })

    it('calls onDifficultyChange when clicking Coop card', () => {
      const onDifficultyChange = jest.fn()
      render(
        <WelcomeScreen {...defaultProps} onDifficultyChange={onDifficultyChange} mode="pvc" />
      )

      fireEvent.click(screen.getByText('Coop'))
      expect(onDifficultyChange).toHaveBeenCalledWith('medium')
    })

    it('calls onDifficultyChange when clicking Bentley card', () => {
      const onDifficultyChange = jest.fn()
      render(
        <WelcomeScreen {...defaultProps} onDifficultyChange={onDifficultyChange} mode="pvc" />
      )

      fireEvent.click(screen.getByText('Bentley'))
      expect(onDifficultyChange).toHaveBeenCalledWith('hard')
    })

    it('does not show PvP description in PvC mode', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvc" />)
      expect(screen.queryByText(/Play against a friend/)).not.toBeInTheDocument()
    })
  })

  describe('PvP mode (vs Player)', () => {
    it('shows PvP description in PvP mode', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvp" />)
      expect(
        screen.getByText('Play against a friend on the same device. Red goes first!')
      ).toBeInTheDocument()
    })

    it('does not show AI opponent cards in PvP mode', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvp" />)
      expect(screen.queryByText('Choose Your Opponent')).not.toBeInTheDocument()
      expect(screen.queryByText('Bella')).not.toBeInTheDocument()
      expect(screen.queryByText('Coop')).not.toBeInTheDocument()
      expect(screen.queryByText('Bentley')).not.toBeInTheDocument()
    })

    it('shows vs text between player indicators', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvp" />)
      expect(screen.getByText('vs')).toBeInTheDocument()
    })
  })

  describe('start game button', () => {
    it('renders Start Game button', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('Start Game')).toBeInTheDocument()
    })

    it('calls onStartGame when Start Game button is clicked', () => {
      const onStartGame = jest.fn()
      render(<WelcomeScreen {...defaultProps} onStartGame={onStartGame} />)

      fireEvent.click(screen.getByText('Start Game'))
      expect(onStartGame).toHaveBeenCalledTimes(1)
    })

    it('Start Game button is present in both modes', () => {
      const { rerender } = render(<WelcomeScreen {...defaultProps} mode="pvc" />)
      expect(screen.getByText('Start Game')).toBeInTheDocument()

      rerender(<WelcomeScreen {...defaultProps} mode="pvp" />)
      expect(screen.getByText('Start Game')).toBeInTheDocument()
    })
  })

  describe('selected opponent visual feedback', () => {
    it('shows checkmark for selected difficulty', () => {
      const { container } = render(
        <WelcomeScreen {...defaultProps} mode="pvc" difficulty="medium" />
      )
      // The checkmark character is rendered for the selected card
      const checkmarks = container.querySelectorAll('div')
      const checkmarkElements = Array.from(checkmarks).filter(
        el => el.textContent === '\u2713' // Unicode check mark
      )
      expect(checkmarkElements.length).toBe(1)
    })
  })
})
