/**
 * Achievement System Type Definitions
 *
 * Exports: Achievement, AchievementId, AchievementState, ACHIEVEMENT_DEFINITIONS.
 * 14 achievements total, only checked in PvC mode. unlockedAt=undefined means locked.
 */

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: number
}

export type AchievementId =
  | 'first_victory'
  | 'triple_jump'
  | 'flawless_victory'
  | 'king_me'
  | 'king_slayer'
  | 'comeback_kid'
  | 'speed_demon'
  | 'beat_bella'
  | 'beat_coop'
  | 'beat_bentley'
  | 'streak_3'
  | 'streak_5'
  | 'centurion'
  | 'board_master'

export type AchievementState = Record<AchievementId, Achievement>

export const ACHIEVEMENT_DEFINITIONS: Record<
  AchievementId,
  { name: string; description: string; icon: string }
> = {
  first_victory: {
    name: 'First Victory',
    description: 'Win your first game',
    icon: '\u{1F3C6}',
  },
  triple_jump: {
    name: 'Triple Threat',
    description: 'Capture 3+ pieces in a single move',
    icon: '\u26A1',
  },
  flawless_victory: {
    name: 'Flawless Victory',
    description: 'Win without losing any pieces',
    icon: '\u{1F48E}',
  },
  king_me: {
    name: 'King Me!',
    description: 'Get your first king',
    icon: '\u{1F451}',
  },
  king_slayer: {
    name: 'King Slayer',
    description: "Capture an opponent's king",
    icon: '\u2694\uFE0F',
  },
  comeback_kid: {
    name: 'Comeback Kid',
    description: 'Win after being down 3+ pieces',
    icon: '\u{1F525}',
  },
  speed_demon: {
    name: 'Speed Demon',
    description: 'Win in under 20 moves',
    icon: '\u{1F4A8}',
  },
  beat_bella: {
    name: 'Puppy Power',
    description: 'Beat Bella',
    icon: '\u{1F415}',
  },
  beat_coop: {
    name: 'Arcade Regular',
    description: 'Beat Coop',
    icon: '\u{1F3AE}',
  },
  beat_bentley: {
    name: 'The Impossible',
    description: 'Beat Bentley',
    icon: '\u{1F43A}',
  },
  streak_3: {
    name: 'Hat Trick',
    description: 'Win 3 games in a row',
    icon: '\u{1F3A9}',
  },
  streak_5: {
    name: 'Unstoppable',
    description: 'Win 5 games in a row',
    icon: '\u{1F31F}',
  },
  centurion: {
    name: 'Centurion',
    description: 'Capture 100 total pieces',
    icon: '\u{1F4AF}',
  },
  board_master: {
    name: 'Board Master',
    description: 'Play 50 total games',
    icon: '\u{1F3B2}',
  },
}
