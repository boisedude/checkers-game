/**
 * Achievements Dialog Component
 *
 * Displays all 14 achievements in a responsive grid. Locked achievements shown
 * at 50% opacity with grayscale icons. Unlocked ones show the unlock date.
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import type { AchievementState } from '@/types/achievements.types'

interface AchievementsDialogProps {
  open: boolean
  onClose: () => void
  achievements: AchievementState
}

export const AchievementsDialog = React.memo(function AchievementsDialog({
  open,
  onClose,
  achievements,
}: AchievementsDialogProps) {
  const achievementList = Object.values(achievements)
  const unlockedCount = achievementList.filter(
    (a) => a.unlockedAt !== undefined
  ).length
  const totalCount = achievementList.length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Achievements</span>
            <span className="text-sm font-normal text-muted-foreground">
              {unlockedCount} of {totalCount} unlocked
            </span>
          </DialogTitle>
          <DialogDescription>
            Finish games in particular ways to unlock these.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
          {achievementList.map((achievement) => {
            const isUnlocked = achievement.unlockedAt !== undefined
            const unlockDate = isUnlocked
              ? new Date(achievement.unlockedAt!).toLocaleDateString()
              : null

            return (
              <div
                key={achievement.id}
                className={`flex items-start gap-3 rounded-md border p-3 ${
                  isUnlocked ? 'border-primary/50 bg-secondary' : 'bg-card opacity-60'
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`text-sm font-semibold ${
                      isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {achievement.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {achievement.description}
                  </span>
                  {unlockDate && (
                    <span className="mt-1 text-xs text-primary">
                      Unlocked {unlockDate}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="h-11 w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
