/**
 * Tutorial Component
 * Step-by-step walkthrough for first-time checkers players
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
    title: 'Welcome to Checkers!',
    description:
      "I'm excited to teach you this classic strategy game. It's easy to learn but takes skill to master!",
    image: (
      <div className="flex items-center justify-center gap-8 py-4">
        <div className="w-14 h-14">
          <Piece piece={{ player: 1, type: 'regular' }} isSelected={false} />
        </div>
        <div className="text-3xl font-bold text-gray-600">VS</div>
        <div className="w-14 h-14">
          <Piece piece={{ player: 2, type: 'regular' }} isSelected={false} />
        </div>
      </div>
    ),
  },
  {
    title: 'The Goal',
    description:
      'Your objective is to capture all of your opponent\'s pieces OR block them so they cannot move. The player who achieves either goal first wins!',
    tip: 'Plan ahead! Every move should either capture pieces or improve your position.',
  },
  {
    title: 'You Play as Red',
    description:
      'You control the RED pieces at the bottom of the board. The AI plays as BLACK pieces at the top. Red always moves first!',
    image: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-2">
            <Piece piece={{ player: 1, type: 'regular' }} isSelected={false} />
          </div>
          <div className="text-sm font-semibold text-red-600">You (Red)</div>
        </div>
        <div className="text-3xl text-gray-400">vs</div>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-2">
            <Piece piece={{ player: 2, type: 'regular' }} isSelected={false} />
          </div>
          <div className="text-sm font-semibold text-gray-800">AI (Black)</div>
        </div>
      </div>
    ),
  },
  {
    title: 'How Pieces Move',
    description:
      'Regular pieces move DIAGONALLY FORWARD, one square at a time. Click a piece to select it, then click a highlighted square to move.',
    tip: 'Your pieces can only move forward (toward the top of the board) until they become Kings!',
    image: (
      <div className="flex justify-center py-4">
        <svg width="160" height="120" viewBox="0 0 160 120">
          {/* Board squares */}
          <rect x="40" y="60" width="40" height="40" fill="#d4a574" />
          <rect x="80" y="60" width="40" height="40" fill="#8b5a2b" />
          <rect x="0" y="20" width="40" height="40" fill="#8b5a2b" />
          <rect x="40" y="20" width="40" height="40" fill="#d4a574" />
          <rect x="80" y="20" width="40" height="40" fill="#8b5a2b" />
          <rect x="120" y="20" width="40" height="40" fill="#d4a574" />

          {/* Red piece */}
          <circle cx="100" cy="80" r="16" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />

          {/* Movement arrows */}
          <path d="M85 65 L55 40" stroke="#22c55e" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />
          <path d="M115 65 L145 40" stroke="#22c55e" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

          {/* Arrow marker definition */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
            </marker>
          </defs>

          {/* Destination highlights */}
          <circle cx="40" cy="40" r="8" fill="#22c55e" opacity="0.5" />
          <circle cx="160" cy="40" r="8" fill="#22c55e" opacity="0.5" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Capturing Pieces',
    description:
      'To capture an opponent\'s piece, JUMP over it diagonally. You land on the empty square behind it, and the captured piece is removed from the board.',
    tip: 'If you CAN capture, you MUST capture! The game will highlight forced captures.',
    image: (
      <div className="flex justify-center py-4">
        <svg width="200" height="140" viewBox="0 0 200 140">
          {/* Board squares */}
          <rect x="40" y="80" width="40" height="40" fill="#8b5a2b" />
          <rect x="80" y="40" width="40" height="40" fill="#8b5a2b" />
          <rect x="120" y="0" width="40" height="40" fill="#8b5a2b" />

          {/* Red piece (jumper) */}
          <circle cx="60" cy="100" r="16" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />

          {/* Black piece (being captured) with X */}
          <circle cx="100" cy="60" r="16" fill="#374151" stroke="#1f2937" strokeWidth="2" />
          <path d="M92 52 L108 68 M108 52 L92 68" stroke="#ef4444" strokeWidth="3" />

          {/* Jump arrow */}
          <path d="M75 85 Q100 40 135 25" stroke="#22c55e" strokeWidth="3" fill="none" strokeDasharray="5,3" markerEnd="url(#arrowhead2)" />

          {/* Arrow marker */}
          <defs>
            <marker id="arrowhead2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
            </marker>
          </defs>

          {/* Landing spot */}
          <circle cx="140" cy="20" r="10" fill="#22c55e" opacity="0.4" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Multi-Jump Captures',
    description:
      'If after capturing a piece you can immediately capture another, you MUST continue jumping! Chain captures are powerful moves that can turn the game around.',
    tip: 'Look for opportunities to set up multi-jump sequences. They can capture 2, 3, or even more pieces in one turn!',
    image: (
      <div className="flex justify-center py-4">
        <svg width="220" height="140" viewBox="0 0 220 140">
          {/* Squares */}
          <rect x="20" y="80" width="40" height="40" fill="#8b5a2b" />
          <rect x="60" y="40" width="40" height="40" fill="#8b5a2b" />
          <rect x="100" y="80" width="40" height="40" fill="#8b5a2b" />
          <rect x="140" y="40" width="40" height="40" fill="#8b5a2b" />
          <rect x="180" y="0" width="40" height="40" fill="#8b5a2b" />

          {/* Red piece */}
          <circle cx="40" cy="100" r="14" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />

          {/* Black pieces being captured */}
          <circle cx="80" cy="60" r="14" fill="#374151" stroke="#1f2937" strokeWidth="2" />
          <path d="M72 52 L88 68 M88 52 L72 68" stroke="#ef4444" strokeWidth="2" />
          <circle cx="160" cy="60" r="14" fill="#374151" stroke="#1f2937" strokeWidth="2" />
          <path d="M152 52 L168 68 M168 52 L152 68" stroke="#ef4444" strokeWidth="2" />

          {/* Jump arrows */}
          <path d="M55 85 L105 105" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead3)" />
          <path d="M135 85 L185 25" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead3)" />

          <defs>
            <marker id="arrowhead3" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
            </marker>
          </defs>

          {/* Path numbers */}
          <circle cx="120" cy="100" r="10" fill="#3b82f6" />
          <text x="120" y="104" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">1</text>
          <circle cx="200" cy="20" r="10" fill="#3b82f6" />
          <text x="200" y="24" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">2</text>
        </svg>
      </div>
    ),
  },
  {
    title: 'Becoming a King',
    description:
      'When your piece reaches the opposite end of the board (the top row for Red), it becomes a KING! Kings are crowned and can move in ALL four diagonal directions.',
    tip: 'Kings are very powerful! Getting a king early gives you a big advantage.',
    image: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-2">
            <Piece piece={{ player: 1, type: 'regular' }} isSelected={false} />
          </div>
          <div className="text-xs text-gray-500">Regular</div>
        </div>
        <div className="text-2xl text-gray-400">-&gt;</div>
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-2">
            <Piece piece={{ player: 1, type: 'king' }} isSelected={false} />
          </div>
          <div className="text-xs text-yellow-600 font-semibold">KING!</div>
        </div>
      </div>
    ),
  },
  {
    title: 'King Movement',
    description:
      'Unlike regular pieces, Kings can move and capture in ALL four diagonal directions - forward and backward! This makes them extremely valuable.',
    tip: 'Protect your kings and try to capture your opponent\'s kings whenever possible.',
    image: (
      <div className="flex justify-center py-4">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* Center square */}
          <rect x="60" y="60" width="40" height="40" fill="#8b5a2b" />

          {/* Corner squares */}
          <rect x="20" y="20" width="40" height="40" fill="#8b5a2b" />
          <rect x="100" y="20" width="40" height="40" fill="#8b5a2b" />
          <rect x="20" y="100" width="40" height="40" fill="#8b5a2b" />
          <rect x="100" y="100" width="40" height="40" fill="#8b5a2b" />

          {/* King piece */}
          <circle cx="80" cy="80" r="16" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />
          {/* Crown */}
          <path d="M72 82 L70 74 L75 78 L80 72 L85 78 L90 74 L88 82 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />

          {/* Movement arrows in all 4 directions */}
          <path d="M68 68 L48 48" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead4)" />
          <path d="M92 68 L112 48" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead4)" />
          <path d="M68 92 L48 112" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead4)" />
          <path d="M92 92 L112 112" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead4)" />

          <defs>
            <marker id="arrowhead4" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
            </marker>
          </defs>

          {/* Destination circles */}
          <circle cx="40" cy="40" r="6" fill="#22c55e" opacity="0.5" />
          <circle cx="120" cy="40" r="6" fill="#22c55e" opacity="0.5" />
          <circle cx="40" cy="120" r="6" fill="#22c55e" opacity="0.5" />
          <circle cx="120" cy="120" r="6" fill="#22c55e" opacity="0.5" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Choose Your Challenge',
    description:
      'Start on Easy mode with Bella to learn the basics. When you\'re ready, challenge Coop on Medium or face Bentley on Hard - he thinks many moves ahead!',
    tip: 'Easy is great for practice. Medium teaches strategy. Hard is for pros!',
    image: (
      <div className="flex items-center justify-center gap-3 py-4 text-sm">
        <div className="text-center px-2">
          <div className="text-2xl mb-1">🐕</div>
          <div className="font-semibold text-amber-600">Bella</div>
          <div className="text-xs text-gray-500">Easy</div>
        </div>
        <div className="text-center px-2">
          <div className="text-2xl mb-1">🎮</div>
          <div className="font-semibold text-blue-600">Coop</div>
          <div className="text-xs text-gray-500">Medium</div>
        </div>
        <div className="text-center px-2">
          <div className="text-2xl mb-1">🐺</div>
          <div className="font-semibold text-red-600">Bentley</div>
          <div className="text-xs text-gray-500">Hard</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Ready to Play!',
    description:
      "You're all set! Remember: control the center, protect your pieces, get kings early, and watch for multi-jump opportunities. Good luck, and have fun!",
    tip: 'Click on a piece to see its valid moves. Forced captures will be highlighted in yellow!',
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <div className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
                Tip
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200">{step.tip}</p>
            </div>
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

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={handleSkip} className="sm:w-auto">
            Skip Tutorial
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button onClick={handleNext}>{isLastStep ? "Let's Play!" : 'Next'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
