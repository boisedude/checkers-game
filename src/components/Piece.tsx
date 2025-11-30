/**
 * Checkers Piece Component
 * Renders a checker piece (regular or king)
 */

import type { Piece as PieceType } from '@/types/checkers.types'

interface PieceProps {
  piece: PieceType
  isSelected: boolean
}

export function Piece({ piece, isSelected }: PieceProps) {
  const baseClasses = `
    w-full h-full rounded-full
    flex items-center justify-center
    transition-all duration-200
    shadow-lg
    cursor-pointer
    ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 scale-110' : ''}
  `

  const playerClasses = piece.player === 1
    ? 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600'
    : 'bg-gradient-to-br from-gray-800 to-black hover:from-gray-700 hover:to-gray-900'

  return (
    <div className={`${baseClasses} ${playerClasses}`}>
      {piece.type === 'king' && (
        <div className="text-2xl font-bold text-yellow-300 drop-shadow-lg">
          ♛
        </div>
      )}
    </div>
  )
}
