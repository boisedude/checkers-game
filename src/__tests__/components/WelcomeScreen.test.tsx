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

  describe('mode toggle buttons', () => {
    it('renders one player button', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('One player')).toBeInTheDocument()
    })

    it('renders two players button', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('Two players')).toBeInTheDocument()
    })

    it('calls onModeChange with pvc when one player button clicked', () => {
      const onModeChange = jest.fn()
      render(<WelcomeScreen {...defaultProps} onModeChange={onModeChange} />)

      fireEvent.click(screen.getByText('One player'))
      expect(onModeChange).toHaveBeenCalledWith('pvc')
    })

    it('calls onModeChange with pvp when two players button clicked', () => {
      const onModeChange = jest.fn()
      render(<WelcomeScreen {...defaultProps} onModeChange={onModeChange} />)

      fireEvent.click(screen.getByText('Two players'))
      expect(onModeChange).toHaveBeenCalledWith('pvp')
    })
  })

  describe('PvC mode (vs AI)', () => {
    it('groups the opponent cards under an Opponent label', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvc" />)
      expect(screen.getByRole('group', { name: 'Opponent' })).toBeInTheDocument()
    })

    it('shows all three AI opponent cards', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvc" />)
      expect(screen.getByText('Bella')).toBeInTheDocument()
      expect(screen.getByText('Coop')).toBeInTheDocument()
      expect(screen.getByText('Bentley')).toBeInTheDocument()
    })

    it('shows difficulty labels on opponent cards', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvc" />)
      expect(screen.getByText('Easy')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('Hard')).toBeInTheDocument()
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
        screen.getByText('Play against a friend on the same device. Red goes first.')
      ).toBeInTheDocument()
    })

    it('does not show AI opponent cards in PvP mode', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvp" />)
      expect(screen.queryByRole('group', { name: 'Opponent' })).not.toBeInTheDocument()
      expect(screen.queryByText('Bella')).not.toBeInTheDocument()
      expect(screen.queryByText('Coop')).not.toBeInTheDocument()
      expect(screen.queryByText('Bentley')).not.toBeInTheDocument()
    })

  })

  describe('start game button', () => {
    it('renders Start game button', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('Start game')).toBeInTheDocument()
    })

    it('calls onStartGame when Start game button is clicked', () => {
      const onStartGame = jest.fn()
      render(<WelcomeScreen {...defaultProps} onStartGame={onStartGame} />)

      fireEvent.click(screen.getByText('Start game'))
      expect(onStartGame).toHaveBeenCalledTimes(1)
    })

    it('Start game button is present in both modes', () => {
      const { rerender } = render(<WelcomeScreen {...defaultProps} mode="pvc" />)
      expect(screen.getByText('Start game')).toBeInTheDocument()

      rerender(<WelcomeScreen {...defaultProps} mode="pvp" />)
      expect(screen.getByText('Start game')).toBeInTheDocument()
    })
  })

  describe('selected opponent visual feedback', () => {
    it('marks only the selected difficulty as pressed', () => {
      render(<WelcomeScreen {...defaultProps} mode="pvc" difficulty="medium" />)
      expect(screen.getByRole('button', { name: /Coop/ })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: /Bella/ })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: /Bentley/ })).toHaveAttribute('aria-pressed', 'false')
    })
  })
})
