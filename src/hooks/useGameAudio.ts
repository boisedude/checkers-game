/**
 * useGameAudio Hook
 *
 * Procedural sound effects via Web Audio API. No audio files needed.
 * Exports: useGameAudio() -> { isMuted, toggleMute, playSound, play[Effect]... }
 *
 * Each effect is a synthesized tone pattern (oscillator + gain envelope).
 * playSound(name) dispatches by SoundEffect name. Individual play* functions
 * are also exported for direct use.
 *
 * Mute state persisted in localStorage via STORAGE_KEYS.AUDIO_MUTED.
 */

import { useCallback, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import { useSharedAudioContext } from '@/hooks/useSharedAudioContext'

type SoundEffect = 'discFlip' | 'discPlace' | 'victory' | 'defeat' | 'draw' | 'click' | 'hover' | 'capture' | 'multiJump' | 'kingPromotion' | 'achievementUnlock'

// Audio timing constants (in seconds)
const AUDIO_TIMING = {
  FLIP_DURATION: 0.2,
  PLACE_DURATION: 0.08,
  VICTORY_NOTE_DELAY: 0.15,
  VICTORY_NOTE_DURATION: 0.3,
  DEFEAT_DURATION: 0.5,
  DRAW_DURATION: 0.3,
  CLICK_DURATION: 0.05,
  HOVER_DURATION: 0.03,
  CAPTURE_DURATION: 0.15,
  MULTI_JUMP_NOTE_DELAY: 0.08,
  MULTI_JUMP_NOTE_DURATION: 0.12,
  PROMOTION_DURATION: 0.4,
  ACHIEVEMENT_DURATION: 0.5,
} as const

/** Creates an oscillator + gain node pair with auto-cleanup on end. */
function createTone(ctx: AudioContext, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.onended = () => { osc.disconnect(); gain.disconnect() }
  return { osc, gain }
}

/** Plays a single tone with optional frequency sweep and attack-decay envelope. */
function playSingleTone(
  ctx: AudioContext,
  config: {
    startFreq: number
    endFreq?: number
    duration: number
    type?: OscillatorType
    peakGain?: number
    attackTime?: number
    startTime?: number
  }
) {
  const start = config.startTime ?? ctx.currentTime
  const { osc, gain } = createTone(ctx, config.type ?? 'sine')

  osc.frequency.setValueAtTime(config.startFreq, start)
  if (config.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(config.endFreq, start + config.duration)
  }

  const peak = config.peakGain ?? 0.15
  const attack = config.attackTime ?? 0.01
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.01, start + config.duration)

  osc.start(start)
  osc.stop(start + config.duration)
}

export function useGameAudio() {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.AUDIO_MUTED) === 'true'
  })

  const { audioContext } = useSharedAudioContext()

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev
      localStorage.setItem(STORAGE_KEYS.AUDIO_MUTED, String(newValue))
      return newValue
    })
  }, [])

  // Disc flip sound (frequency sweep: 200→600→300)
  const playDiscFlip = useCallback(() => {
    if (isMuted || !audioContext) return
    const ctx = audioContext
    const now = ctx.currentTime
    const { osc, gain } = createTone(ctx, 'sine')

    osc.frequency.setValueAtTime(200, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1)
    osc.frequency.exponentialRampToValueAtTime(300, now + AUDIO_TIMING.FLIP_DURATION)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.01, now + AUDIO_TIMING.FLIP_DURATION)

    osc.start(now)
    osc.stop(now + AUDIO_TIMING.FLIP_DURATION)
  }, [isMuted, audioContext])

  // Disc place sound (gentle click: 500→200)
  const playDiscPlace = useCallback(() => {
    if (isMuted || !audioContext) return
    playSingleTone(audioContext, {
      startFreq: 500, endFreq: 200, duration: AUDIO_TIMING.PLACE_DURATION, peakGain: 0.2,
    })
  }, [isMuted, audioContext])

  // Victory sound (ascending C major chord: C, E, G, C)
  const playVictory = useCallback(() => {
    if (isMuted || !audioContext) return
    const now = audioContext.currentTime;
    [262, 330, 392, 523].forEach((freq, i) => {
      playSingleTone(audioContext, {
        startFreq: freq,
        duration: AUDIO_TIMING.VICTORY_NOTE_DURATION,
        type: 'triangle',
        peakGain: 0.2,
        attackTime: 0.05,
        startTime: now + i * AUDIO_TIMING.VICTORY_NOTE_DELAY,
      })
    })
  }, [isMuted, audioContext])

  // Defeat sound (sad descending sawtooth: 300→100)
  const playDefeat = useCallback(() => {
    if (isMuted || !audioContext) return
    playSingleTone(audioContext, {
      startFreq: 300, endFreq: 100, duration: AUDIO_TIMING.DEFEAT_DURATION,
      type: 'sawtooth', peakGain: 0.2, attackTime: 0.05,
    })
  }, [isMuted, audioContext])

  // Draw sound (two neutral tones: A3 + E4)
  const playDraw = useCallback(() => {
    if (isMuted || !audioContext) return
    for (const freq of [220, 330]) {
      playSingleTone(audioContext, {
        startFreq: freq, duration: AUDIO_TIMING.DRAW_DURATION, peakGain: 0.15, attackTime: 0.05,
      })
    }
  }, [isMuted, audioContext])

  // Click sound (UI feedback: 800→400 square)
  const playClick = useCallback(() => {
    if (isMuted || !audioContext) return
    const ctx = audioContext
    const now = ctx.currentTime
    const { osc, gain } = createTone(ctx, 'square')
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(400, now + AUDIO_TIMING.CLICK_DURATION)
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + AUDIO_TIMING.CLICK_DURATION)
    osc.start(now)
    osc.stop(now + AUDIO_TIMING.CLICK_DURATION)
  }, [isMuted, audioContext])

  // Hover sound (subtle sine at 600Hz)
  const playHover = useCallback(() => {
    if (isMuted || !audioContext) return
    const ctx = audioContext
    const now = ctx.currentTime
    const { osc, gain } = createTone(ctx, 'sine')
    osc.frequency.setValueAtTime(600, now)
    gain.gain.setValueAtTime(0.05, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + AUDIO_TIMING.HOVER_DURATION)
    osc.start(now)
    osc.stop(now + AUDIO_TIMING.HOVER_DURATION)
  }, [isMuted, audioContext])

  // Capture sound (deep triangle thud: 300→80)
  const playCapture = useCallback(() => {
    if (isMuted || !audioContext) return
    playSingleTone(audioContext, {
      startFreq: 300, endFreq: 80, duration: AUDIO_TIMING.CAPTURE_DURATION,
      type: 'triangle', peakGain: 0.25,
    })
  }, [isMuted, audioContext])

  // Multi-jump sound (ascending combo: E4→A4→C#5→E5)
  const playMultiJump = useCallback(() => {
    if (isMuted || !audioContext) return
    const now = audioContext.currentTime;
    [330, 440, 554, 659].forEach((freq, i) => {
      playSingleTone(audioContext, {
        startFreq: freq,
        duration: AUDIO_TIMING.MULTI_JUMP_NOTE_DURATION,
        peakGain: 0.18,
        attackTime: 0.02,
        startTime: now + i * AUDIO_TIMING.MULTI_JUMP_NOTE_DELAY,
      })
    })
  }, [isMuted, audioContext])

  // King promotion sound (ascending sweep → major chord: C5+E5+G5)
  const playKingPromotion = useCallback(() => {
    if (isMuted || !audioContext) return
    const ctx = audioContext
    const now = ctx.currentTime

    // Ascending sweep
    playSingleTone(ctx, {
      startFreq: 200, endFreq: 800, duration: 0.25, peakGain: 0.12, attackTime: 0.05,
    })

    // Chord at the end (C5, E5, G5)
    for (const freq of [523, 659, 784]) {
      const { osc, gain } = createTone(ctx, 'triangle')
      osc.frequency.setValueAtTime(freq, now + 0.15)
      gain.gain.setValueAtTime(0, now + 0.15)
      gain.gain.linearRampToValueAtTime(0.1, now + 0.2)
      gain.gain.exponentialRampToValueAtTime(0.01, now + AUDIO_TIMING.PROMOTION_DURATION)
      osc.start(now + 0.15)
      osc.stop(now + AUDIO_TIMING.PROMOTION_DURATION)
    }
  }, [isMuted, audioContext])

  // Achievement unlock sound (bright chime: G5→C6)
  const playAchievementUnlock = useCallback(() => {
    if (isMuted || !audioContext) return
    const now = audioContext.currentTime;
    [784, 1047].forEach((freq, i) => {
      playSingleTone(audioContext, {
        startFreq: freq,
        duration: AUDIO_TIMING.ACHIEVEMENT_DURATION - i * 0.1,
        peakGain: 0.15,
        attackTime: 0.03,
        startTime: now + i * 0.12,
      })
    })
  }, [isMuted, audioContext])

  // Dispatcher for playing any sound effect by name
  const playSound = useCallback(
    (effect: SoundEffect) => {
      const handlers: Record<SoundEffect, () => void> = {
        discFlip: playDiscFlip,
        discPlace: playDiscPlace,
        victory: playVictory,
        defeat: playDefeat,
        draw: playDraw,
        click: playClick,
        hover: playHover,
        capture: playCapture,
        multiJump: playMultiJump,
        kingPromotion: playKingPromotion,
        achievementUnlock: playAchievementUnlock,
      }
      handlers[effect]()
    },
    [playDiscFlip, playDiscPlace, playVictory, playDefeat, playDraw, playClick, playHover, playCapture, playMultiJump, playKingPromotion, playAchievementUnlock]
  )

  return {
    isMuted,
    toggleMute,
    playSound,
    playDiscFlip,
    playDiscPlace,
    playVictory,
    playDefeat,
    playDraw,
    playClick,
    playHover,
    playCapture,
    playMultiJump,
    playKingPromotion,
    playAchievementUnlock,
  }
}
