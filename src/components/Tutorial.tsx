/**
 * Tutorial Component
 *
 * 9-step guided walkthrough with inline SVG diagrams and Piece component demos.
 * Steps cover: basics, goals, movement, captures, multi-jumps, kings, difficulty.
 * onComplete marks tutorial as done in localStorage to prevent re-showing.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Piece } from './Piece'
import { getCharacterById } from '@shared/characters'

interface TutorialProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

interface TutorialStep {
  title: string
  description: string
  tip?: string
  image?: React.ReactNode
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to checkers',
    description:
      'A classic strategy game. It is easy to learn and takes skill to master.',
    image: (
      <div className="flex items-center justify-center gap-8 py-4">
        <div className="w-14 h-14">
          <Piece piece={{ player: 1, type: 'regular' }} isSelected={false} />
        </div>
        <div className="text-lg text-muted-foreground">vs</div>
        <div className="w-14 h-14">
          <Piece piece={{ player: 2, type: 'regular' }} isSelected={false} />
        </div>
      </div>
    ),
  },
  {
    title: 'The goal',
    description:
      'Capture all of your opponent\'s pieces, or block them so they cannot move. Whoever does either first wins.',
    tip: 'Plan ahead. Every move should either capture a piece or improve your position.',
  },
  {
    title: 'You play red',
    description:
      'You control the red pieces at the bottom of the board. Your opponent plays the black pieces at the top. Red always moves first.',
    image: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-2">
            <Piece piece={{ player: 1, type: 'regular' }} isSelected={false} />
          </div>
          <div className="text-sm font-semibold">You (red)</div>
        </div>
        <div className="text-lg text-muted-foreground">vs</div>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-2">
            <Piece piece={{ player: 2, type: 'regular' }} isSelected={false} />
          </div>
          <div className="text-sm font-semibold">Opponent (black)</div>
        </div>
      </div>
    ),
  },
  {
    title: 'How pieces move',
    description:
      'Regular pieces move diagonally forward, one square at a time. Select a piece, then select a marked square to move.',
    tip: 'Your pieces can only move forward, toward the top of the board, until they become kings.',
    image: (
      <div className="flex justify-center py-4">
        <svg width="160" height="120" viewBox="0 0 160 120">
          {/* Board squares */}
          <rect x="40" y="60" width="40" height="40" fill="#d8bd8f" />
          <rect x="80" y="60" width="40" height="40" fill="#6b4a38" />
          <rect x="0" y="20" width="40" height="40" fill="#6b4a38" />
          <rect x="40" y="20" width="40" height="40" fill="#d8bd8f" />
          <rect x="80" y="20" width="40" height="40" fill="#6b4a38" />
          <rect x="120" y="20" width="40" height="40" fill="#d8bd8f" />

          {/* Red piece */}
          <circle cx="100" cy="80" r="16" fill="#c0392b" stroke="#8e2a20" strokeWidth="2" />

          {/* Movement arrows */}
          <path d="M85 65 L55 40" stroke="#b5ca9b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />
          <path d="M115 65 L145 40" stroke="#b5ca9b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

          {/* Arrow marker definition */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#b5ca9b" />
            </marker>
          </defs>

          {/* Destination highlights */}
          <circle cx="40" cy="40" r="8" fill="#b5ca9b" opacity="0.5" />
          <circle cx="160" cy="40" r="8" fill="#b5ca9b" opacity="0.5" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Capturing pieces',
    description:
      'To capture a piece, jump over it diagonally. You land on the empty square behind it and the captured piece comes off the board.',
    tip: 'If you can capture, you must. The turn indicator reads "You must jump" when a capture is forced.',
    image: (
      <div className="flex justify-center py-4">
        <svg width="200" height="140" viewBox="0 0 200 140">
          {/* Board squares */}
          <rect x="40" y="80" width="40" height="40" fill="#6b4a38" />
          <rect x="80" y="40" width="40" height="40" fill="#6b4a38" />
          <rect x="120" y="0" width="40" height="40" fill="#6b4a38" />

          {/* Red piece (jumper) */}
          <circle cx="60" cy="100" r="16" fill="#c0392b" stroke="#8e2a20" strokeWidth="2" />

          {/* Black piece (being captured) with X */}
          <circle cx="100" cy="60" r="16" fill="#2b2b2b" stroke="#121212" strokeWidth="2" />
          <path d="M92 52 L108 68 M108 52 L92 68" stroke="#f2877d" strokeWidth="3" />

          {/* Jump arrow */}
          <path d="M75 85 Q100 40 135 25" stroke="#b5ca9b" strokeWidth="3" fill="none" strokeDasharray="5,3" markerEnd="url(#arrowhead2)" />

          {/* Arrow marker */}
          <defs>
            <marker id="arrowhead2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#b5ca9b" />
            </marker>
          </defs>

          {/* Landing spot */}
          <circle cx="140" cy="20" r="10" fill="#b5ca9b" opacity="0.4" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Multi-jump captures',
    description:
      'If you can capture again right after a jump, you must keep jumping. Chain captures can turn a game around.',
    tip: 'Look for ways to set up multi-jumps. They can take two, three or more pieces in one turn.',
    image: (
      <div className="flex justify-center py-4">
        <svg width="220" height="140" viewBox="0 0 220 140">
          {/* Squares */}
          <rect x="20" y="80" width="40" height="40" fill="#6b4a38" />
          <rect x="60" y="40" width="40" height="40" fill="#6b4a38" />
          <rect x="100" y="80" width="40" height="40" fill="#6b4a38" />
          <rect x="140" y="40" width="40" height="40" fill="#6b4a38" />
          <rect x="180" y="0" width="40" height="40" fill="#6b4a38" />

          {/* Red piece */}
          <circle cx="40" cy="100" r="14" fill="#c0392b" stroke="#8e2a20" strokeWidth="2" />

          {/* Black pieces being captured */}
          <circle cx="80" cy="60" r="14" fill="#2b2b2b" stroke="#121212" strokeWidth="2" />
          <path d="M72 52 L88 68 M88 52 L72 68" stroke="#f2877d" strokeWidth="2" />
          <circle cx="160" cy="60" r="14" fill="#2b2b2b" stroke="#121212" strokeWidth="2" />
          <path d="M152 52 L168 68 M168 52 L152 68" stroke="#f2877d" strokeWidth="2" />

          {/* Jump arrows */}
          <path d="M55 85 L105 105" stroke="#b5ca9b" strokeWidth="2" fill="none" markerEnd="url(#arrowhead3)" />
          <path d="M135 85 L185 25" stroke="#b5ca9b" strokeWidth="2" fill="none" markerEnd="url(#arrowhead3)" />

          <defs>
            <marker id="arrowhead3" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#b5ca9b" />
            </marker>
          </defs>

          {/* Path numbers */}
          <circle cx="120" cy="100" r="10" fill="#5b7f95" />
          <text x="120" y="104" textAnchor="middle" fill="#14212b" fontSize="12" fontWeight="bold">1</text>
          <circle cx="200" cy="20" r="10" fill="#5b7f95" />
          <text x="200" y="24" textAnchor="middle" fill="#14212b" fontSize="12" fontWeight="bold">2</text>
        </svg>
      </div>
    ),
  },
  {
    title: 'Becoming a king',
    description:
      'When a piece reaches the far end of the board (the top row for red), it is crowned a king. Kings can move in all four diagonal directions.',
    tip: 'A king early in the game is a big advantage.',
    image: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-2">
            <Piece piece={{ player: 1, type: 'regular' }} isSelected={false} />
          </div>
          <div className="text-xs text-muted-foreground">Regular</div>
        </div>
        <div className="text-xl text-muted-foreground">to</div>
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-2">
            <Piece piece={{ player: 1, type: 'king' }} isSelected={false} />
          </div>
          <div className="text-xs font-semibold">King</div>
        </div>
      </div>
    ),
  },
  {
    title: 'King movement',
    description:
      'Unlike regular pieces, kings move and capture in all four diagonal directions, forward and backward.',
    tip: 'Protect your kings, and capture your opponent\'s kings when you can.',
    image: (
      <div className="flex justify-center py-4">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* Center square */}
          <rect x="60" y="60" width="40" height="40" fill="#6b4a38" />

          {/* Corner squares */}
          <rect x="20" y="20" width="40" height="40" fill="#6b4a38" />
          <rect x="100" y="20" width="40" height="40" fill="#6b4a38" />
          <rect x="20" y="100" width="40" height="40" fill="#6b4a38" />
          <rect x="100" y="100" width="40" height="40" fill="#6b4a38" />

          {/* King piece */}
          <circle cx="80" cy="80" r="16" fill="#c0392b" stroke="#8e2a20" strokeWidth="2" />
          {/* Crown */}
          <path d="M72 82 L70 74 L75 78 L80 72 L85 78 L90 74 L88 82 Z" fill="#e6d3a0" stroke="#8a7a4a" strokeWidth="1" />

          {/* Movement arrows in all 4 directions */}
          <path d="M68 68 L48 48" stroke="#b5ca9b" strokeWidth="2" markerEnd="url(#arrowhead4)" />
          <path d="M92 68 L112 48" stroke="#b5ca9b" strokeWidth="2" markerEnd="url(#arrowhead4)" />
          <path d="M68 92 L48 112" stroke="#b5ca9b" strokeWidth="2" markerEnd="url(#arrowhead4)" />
          <path d="M92 92 L112 112" stroke="#b5ca9b" strokeWidth="2" markerEnd="url(#arrowhead4)" />

          <defs>
            <marker id="arrowhead4" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#b5ca9b" />
            </marker>
          </defs>

          {/* Destination circles */}
          <circle cx="40" cy="40" r="6" fill="#b5ca9b" opacity="0.5" />
          <circle cx="120" cy="40" r="6" fill="#b5ca9b" opacity="0.5" />
          <circle cx="40" cy="120" r="6" fill="#b5ca9b" opacity="0.5" />
          <circle cx="120" cy="120" r="6" fill="#b5ca9b" opacity="0.5" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Choose your opponent',
    description:
      'Start with Bella to learn the basics. Coop plays a steadier game, and Bentley thinks many moves ahead.',
    tip: 'You can change opponent from the chip at the top, or start a new game from setup.',
    image: (
      <div className="flex items-center justify-center gap-6 py-4 text-sm">
        {(
          [
            ['bella', 'Bella', 'Easy'],
            ['coop', 'Coop', 'Medium'],
            ['bentley', 'Bentley', 'Hard'],
          ] as const
        ).map(([id, name, level]) => (
          <div key={id} className="text-center">
            <img
              src={getCharacterById(id).avatar}
              alt=""
              className="mx-auto mb-2 h-12 w-12 rounded-full object-cover"
              style={{ boxShadow: `0 0 0 2px var(--arcade-${id})` }}
            />
            <div className="font-semibold">{name}</div>
            <div className="text-xs text-muted-foreground">{level}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Ready to play',
    description:
      'Control the centre, protect your pieces, crown kings early and watch for multi-jumps.',
    tip: 'Select a piece to see its legal moves marked on the board.',
  },
]

export function Tutorial({ open, onClose, onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = tutorialSteps[currentStep]
  const isLastStep = currentStep === tutorialSteps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
      onClose()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
    onClose()
  }

  // Reset step when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{step.title}</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {tutorialSteps.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Visual */}
          {step.image && <div className="py-2">{step.image}</div>}

          {/* Description */}
          <p className="text-center text-muted-foreground">{step.description}</p>

          {/* Tip */}
          {step.tip && (
            <p className="rounded-md border bg-secondary p-3 text-sm text-muted-foreground">
              {step.tip}
            </p>
          )}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : index < currentStep
                      ? 'bg-primary/50'
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between sm:space-x-0">
          <Button variant="ghost" onClick={handleSkip} className="h-11 sm:w-auto">
            Skip
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} className="h-11">
                Back
              </Button>
            )}
            <Button onClick={handleNext} className="h-11">{isLastStep ? 'Play' : 'Next'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
