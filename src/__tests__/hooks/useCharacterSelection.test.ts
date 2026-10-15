import { renderHook } from '@testing-library/react'
import { getInitialDifficulty, useCharacterSelection } from '@/hooks/useCharacterSelection'

describe('getInitialDifficulty', () => {
  it('maps ?character=bentley to hard', () => {
    expect(getInitialDifficulty('?character=bentley')).toBe('hard')
  })
  it('maps ?character=bella to easy', () => {
    expect(getInitialDifficulty('?character=bella')).toBe('easy')
  })
  it('maps ?character=coop to medium', () => {
    expect(getInitialDifficulty('?character=coop')).toBe('medium')
  })
  it('defaults to medium with no or invalid parameter', () => {
    expect(getInitialDifficulty('')).toBe('medium')
    expect(getInitialDifficulty('?character=nobody')).toBe('medium')
    expect(getInitialDifficulty('?character=constructor')).toBe('medium')
  })
})

describe('useCharacterSelection', () => {
  it('derives the character from the difficulty', () => {
    expect(renderHook(() => useCharacterSelection('hard')).result.current.character.id).toBe('bentley')
    expect(renderHook(() => useCharacterSelection('easy')).result.current.character.id).toBe('bella')
    expect(renderHook(() => useCharacterSelection('medium')).result.current.character.id).toBe('coop')
  })
})
