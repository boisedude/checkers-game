/**
 * Audio Controls Component
 *
 * Two ghost icon buttons for the top bar: sound effects and music.
 */

import { Button } from './ui/button'
import { VolumeIcon, VolumeOffIcon, MusicIcon } from '@shared/icons'

interface AudioControlsProps {
  isSfxMuted: boolean
  isMusicMuted: boolean
  onToggleSfx: () => void
  onToggleMusic: () => void
}

export function AudioControls({ isSfxMuted, isMusicMuted, onToggleSfx, onToggleMusic }: AudioControlsProps) {
  return (
    <>
      <Button
        onClick={onToggleSfx}
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0"
        aria-label={isSfxMuted ? 'Unmute sounds' : 'Mute sounds'}
        title={isSfxMuted ? 'Unmute sounds' : 'Mute sounds'}
      >
        {isSfxMuted ? <VolumeOffIcon /> : <VolumeIcon />}
      </Button>
      <Button
        onClick={onToggleMusic}
        variant="ghost"
        size="icon"
        className={`h-11 w-11 shrink-0 ${isMusicMuted ? 'opacity-50' : ''}`}
        aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
        title={isMusicMuted ? 'Unmute music' : 'Mute music'}
      >
        <span className="relative inline-flex">
          <MusicIcon />
          {isMusicMuted && (
            <svg viewBox="0 0 24 24" width="20" height="20" className="absolute inset-0" aria-hidden="true">
              <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          )}
        </span>
      </Button>
    </>
  )
}
