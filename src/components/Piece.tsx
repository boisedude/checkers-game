/**
 * Piece Component
 *
 * A checkers man drawn as a turned disc lit from above, in inline SVG: a contact
 * shadow, the disc's edge, a face with a soft top-left light, a rim and two turned
 * ridges. The player's men are oxblood; the opponent's are charcoal with a lighter
 * rim so they read on walnut. A king is a second disc stacked underneath (a thicker
 * double edge) with a brass crown inlaid in the face.
 */

import React, { useId } from 'react'
import type { CSSProperties } from 'react'
import type { Piece as PieceType } from '@/types/checkers.types'
import { cn } from '@/lib/utils'

interface PieceProps {
  piece: PieceType
  isSelected?: boolean
  /** A brass ring around the disc: this man must jump, or it decided the game. */
  ring?: boolean
  /** Crowned by the move being shown: the second disc and crown settle in after this many ms. */
  crownDelayMs?: number | null
  className?: string
}

const PALETTE = {
  1: {
    // Oxblood
    light: '#b0473d',
    base: '#7f2220',
    dark: '#561514',
    edge: '#47100f',
    edgeLow: '#360b0b',
    rim: '#9b3a32',
    groove: 'rgba(40, 6, 6, 0.55)',
  },
  2: {
    // Charcoal with a lighter rim
    light: '#59616a',
    base: '#2c3136',
    dark: '#1a1d21',
    edge: '#16191c',
    edgeLow: '#0e1012',
    rim: '#7f8890',
    groove: 'rgba(0, 0, 0, 0.6)',
  },
} as const

export const Piece = React.memo(function Piece({
  piece,
  isSelected = false,
  ring = false,
  crownDelayMs = null,
  className,
}: PieceProps) {
  const uid = useId().replace(/:/g, '')
  const isKing = piece.type === 'king'
  const colors = PALETTE[piece.player]
  // The face sits on one disc for a man, on two for a king.
  const faceY = isKing ? 43 : 48
  const crowning = isKing && crownDelayMs !== null

  const label = `${piece.player === 1 ? 'Red' : 'Black'} ${isKing ? 'king' : 'piece'}${isSelected ? ', selected' : ''}`

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('ck-piece', crowning && 'ck-crowning', className)}
      style={crowning ? ({ '--crown-delay': `${crownDelayMs}ms` } as CSSProperties) : undefined}
      role="img"
      aria-label={label}
      data-player={piece.player}
      data-king={isKing ? 'true' : undefined}
    >
      <defs>
        <radialGradient id={`${uid}-face`} cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor={colors.light} />
          <stop offset="0.5" stopColor={colors.base} />
          <stop offset="1" stopColor={colors.dark} />
        </radialGradient>
        <radialGradient id={`${uid}-shadow`} cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor="#000" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-light`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {isKing && (
          <linearGradient id={`${uid}-brass`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3d68a" />
            <stop offset="0.55" stopColor="#d8ac4b" />
            <stop offset="1" stopColor="#9f7429" />
          </linearGradient>
        )}
      </defs>

      {/* Contact shadow */}
      <ellipse cx="51" cy={isKing ? 62 : 57} rx="47" ry="42" fill={`url(#${uid}-shadow)`} />

      {/* A king's second disc, underneath */}
      {isKing && (
        <g className="ck-under">
          <circle cx="50" cy="58" r="41" fill={colors.edgeLow} />
          <circle cx="50" cy="54" r="41" fill={colors.edge} />
          <path d="M9 54 A41 41 0 0 0 91 54" fill="none" stroke={colors.rim} strokeOpacity="0.35" strokeWidth="1" />
        </g>
      )}

      <g className="ck-top">
        {/* The disc's edge */}
        <circle cx="50" cy={faceY + 5} r="41" fill={isKing ? colors.edgeLow : colors.edge} />
        {isKing && <circle cx="50" cy={faceY + 3.5} r="41" fill={colors.edge} />}

        {/* Face, rim and turned ridges */}
        <circle cx="50" cy={faceY} r="41" fill={`url(#${uid}-face)`} />
        <circle cx="50" cy={faceY} r="38.5" fill="none" stroke={colors.rim} strokeWidth="4" strokeOpacity="0.85" />
        <circle cx="50" cy={faceY} r="36" fill="none" stroke={colors.groove} strokeWidth="1.2" />
        <circle cx="50" cy={faceY} r="29" fill="none" stroke={colors.groove} strokeWidth="1.1" />
        <circle cx="50" cy={faceY + 0.9} r="29" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="0.8" />
        <circle cx="50" cy={faceY} r="21" fill="none" stroke={colors.groove} strokeWidth="1" />
        <circle cx="50" cy={faceY + 0.9} r="21" fill="none" stroke="#fff" strokeOpacity="0.08" strokeWidth="0.8" />

        {/* Soft light from the top left */}
        <ellipse cx="38" cy={faceY - 13} rx="24" ry="16" transform={`rotate(-28 38 ${faceY - 13})`} fill={`url(#${uid}-light)`} />

        {/* Inlaid brass crown */}
        {isKing && (
          <g transform={`translate(50 ${faceY + 1})`} aria-hidden="true">
            <g className="ck-crown">
            <path
              d="M-16 7 L-18.5 -9 L-8.5 -1.5 L0 -13 L8.5 -1.5 L18.5 -9 L16 7 Z M-16 10 H16 V14.5 H-16 Z"
              fill="rgba(0,0,0,0.45)"
              transform="translate(0 1)"
            />
            <path
              d="M-16 7 L-18.5 -9 L-8.5 -1.5 L0 -13 L8.5 -1.5 L18.5 -9 L16 7 Z M-16 10 H16 V14.5 H-16 Z"
              fill={`url(#${uid}-brass)`}
              stroke="#5c3f12"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <circle cx="-18.5" cy="-10.5" r="2.4" fill={`url(#${uid}-brass)`} stroke="#5c3f12" strokeWidth="0.7" />
            <circle cx="0" cy="-14.8" r="2.6" fill={`url(#${uid}-brass)`} stroke="#5c3f12" strokeWidth="0.7" />
            <circle cx="18.5" cy="-10.5" r="2.4" fill={`url(#${uid}-brass)`} stroke="#5c3f12" strokeWidth="0.7" />
            </g>
          </g>
        )}

        {/* Must jump, or decided the game */}
        {ring && (
          <g className="ck-ring">
            <circle cx="50" cy={faceY} r="45.5" fill="none" stroke="#120c05" strokeOpacity="0.75" strokeWidth="7.5" />
            <circle cx="50" cy={faceY} r="45.5" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" />
          </g>
        )}
      </g>
    </svg>
  )
})
