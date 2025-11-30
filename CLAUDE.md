# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

This is **Othello (Reversi) - Play Coop!** - a classic strategy board game with personality. Challenge Coop, an AI opponent with three difficulty levels, complete with disc-flipping animations, rotating victory messages, and smooth gameplay. Built as a portfolio piece for www.mcooper.com.

### Game Features

- **"Play Coop" Theme** - Challenge Coop, your AI opponent with personality!
- **3 Difficulty Levels with Character**:
  - **😴 Sleepy Coop** (Easy): Random move selection - barely functional
  - **🤓 Caffeinated Coop** (Medium): Coffee-powered greedy strategy
  - **🐺 Bentley - The Mastermind** (Hard): Minimax algorithm with alpha-beta pruning (depth 6)
- **30+ Rotating Victory/Defeat Messages** - Disc-flipping themed humor
- **Smooth Disc-Flipping Animations** - 3D CSS transforms (600ms animation)
- **Sound Effects** - Web Audio API for disc place, flip, victory, defeat
- **Leaderboard System** - Track wins, losses, margins, perfect games
- **Valid Move Indicators** - Visual hints showing legal moves
- **Keyboard Controls** - Full keyboard support for accessibility
- **Local Persistence** - Stats and game state saved with validation
- **Responsive UI** - Beautiful green board with emerald tones

### Technology Stack

- **React 19** with TypeScript - Latest React features with strict mode compliance
- **Vite 5** - Lightning-fast build tool and dev server (port 3002)
- **Tailwind CSS + shadcn/ui** - Beautiful, accessible components
- **React Router 7** - Client-side routing (HashRouter)
- **Web Audio API** - Dynamic sound effects
- **Error Boundaries** - Graceful error handling

## Common Development Commands

### Development

```bash
npm install --no-bin-links           # Install dependencies (required for WSL)
npm run dev                          # Start development server (default port 3002, may use 3003 if busy)
npm run build                        # Build for production
npm run preview                      # Preview production build
```

### Code Quality

```bash
npm run lint                         # Run ESLint
npm run lint:fix                     # Auto-fix issues
npm run format                       # Format with Prettier
npm run type-check                   # Run TypeScript compiler
```

**Note**: This project does not currently include automated tests (Jest/Playwright). Type checking and linting provide code quality assurance.

## Project Structure

```
othello/
├── src/
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components (button, card, dialog, select, input)
│   │   ├── Board.tsx               # Main game board (8x8 grid) with hover effects
│   │   ├── Cell.tsx                # Individual cell with disc display
│   │   ├── Disc.tsx                # Animated disc component (black/white with flip)
│   │   ├── GameControls.tsx        # Coop difficulty selector and controls
│   │   ├── VictoryDialog.tsx       # End game dialog with rotating messages
│   │   └── LeaderboardDialog.tsx   # "Your Record vs Coop" stats
│   ├── pages/
│   │   └── OthelloGame.tsx         # Main game page with "Play Coop" branding
│   ├── hooks/
│   │   ├── useOthelloGame.ts       # Game state management (with flip animation)
│   │   ├── useLeaderboard.ts       # Stats management (with localStorage validation)
│   │   └── useGameAudio.ts         # Web Audio API sound effects
│   ├── lib/
│   │   ├── othelloRules.ts         # Game rules engine (move validation, flipping)
│   │   ├── gameStateHelper.ts      # Initial state creation
│   │   ├── aiStrategies.ts         # AI algorithms for all Coop levels
│   │   └── utils.ts                # Utility functions
│   ├── types/
│   │   └── othello.types.ts        # TypeScript types for game state
│   ├── App.tsx                     # Main app with routing and error boundary
│   ├── main.tsx                    # Entry point
│   ├── index.css                   # Global styles with disc-flip animation
│   └── vite-env.d.ts               # Vite type declarations
├── index.html                      # HTML entry point
├── vite.config.ts                  # Vite configuration (port 3002)
├── tailwind.config.js              # Tailwind CSS configuration with flip animation
└── package.json                    # Dependencies and scripts
```

## Architecture & Conventions

### Game Architecture

#### Game State Management (`useOthelloGame` hook)

- Manages complete game state (board, current player, status, winner, difficulty)
- Handles move validation and execution with disc-flipping animation
- **Animation System**:
  - 600ms disc flip animation with 100ms state update delay
  - Proper timeout cleanup to prevent memory leaks
  - Tracks `lastFlippedDiscs` array for animation triggers
  - Cancels animations on game reset
- **AI Move Scheduling**:
  - Triggers Coop's moves automatically when it's his turn (800ms delay)
  - Debounced to prevent duplicate AI moves
  - Proper cleanup in unmount and game reset
- Provides game controls (start, reset, difficulty change)

#### Game Rules Engine (`othelloRules.ts`)

- **Board layout**: 8x8 grid
- **Initial setup**: 4 discs in center (WB/BW pattern)
- **Move execution**: Place disc and flip all flanked opponent discs
  - `executeMove()` - Instant move execution
  - `makeMove()` - Complete game state update
  - `getFlippedDiscs()` - Returns all discs that would flip
- **Move validation**: `getValidMoves()` - Returns all legal moves with flip counts
- **Win detection**: `getWinner()` - Compares disc counts
- **Game over condition**: Board full OR neither player has valid moves
- **Move simulation**: `simulateMove()` for AI lookahead
- **Debug function**: `printBoard()` guarded with `import.meta.env.DEV` check

#### AI Strategies - "Coop's Brain" (`aiStrategies.ts`)

Each difficulty level represents a different version of Coop:

- **😴 Sleepy Coop (Easy)**: Random move selection
  - "Hung over and can barely think straight"
  - Perfect for beginners

- **🤓 Caffeinated Coop (Medium)**: Greedy algorithm
  - Prioritize corners (can never be flipped)
  - Avoid X-squares near empty corners
  - Prefer edges over center
  - Maximize disc flips
  - "Coffee-powered tactical thinking"

- **🐺 Bentley - The Mastermind (Hard)**: Minimax with alpha-beta pruning
  - Search depth: 6 levels
  - Evaluation: Position scoring (corners +100, X-squares -25, edges +5) + mobility + disc count
  - Move ordering for better pruning (corners first)
  - "Bringing the full analytical power"

#### Victory/Defeat System (`VictoryDialog.tsx`)

- **30+ Rotating Messages**: Random selection from message pools
- **Difficulty-Specific Humor**:
  - Sleepy Coop: Hung over jokes, embarrassment for losing
  - Caffeinated Coop: Coffee references, moderate roasting
  - Bentley - The Mastermind: Epic celebrations, savage roasts
- **Othello-Themed**: Disc-flipping jokes, corner strategy references
- Messages rotate to prevent repetition

#### Leaderboard System (`useLeaderboard` hook)

- Tracks player stats vs Coop in localStorage
- **Comprehensive Validation** (Security Fix):
  - Type guards prevent corrupted data crashes
  - Validates all fields before loading
  - Automatic cleanup of invalid data
- Metrics: wins, losses, draws, win streak, longest streak, largest margin, perfect games, total discs flipped
- Persistent across sessions

#### Audio System (`useGameAudio` hook)

- **Web Audio API** for dynamic sound generation
- Sound effects:
  - Disc place (gentle click)
  - Disc flip (swoosh)
  - Victory (triumphant fanfare)
  - Defeat (sad trombone)
  - Draw (neutral chime)
  - Click/hover (UI feedback)
- Mute toggle with localStorage persistence
- Type-safe webkit browser support

### Component Organization

- **Pages**: Page components in `src/pages/`
- **Components**: Reusable components in `src/components/`
- **UI Components**: shadcn/ui components in `src/components/ui/`
- **Hooks**: Custom hooks in `src/hooks/`
- **Game Logic**: Game rules and AI in `src/lib/`
- **Type Definitions**: TypeScript types in `src/types/`
- Use `@/` path alias for imports: `import { cn } from '@/lib/utils'`

### Styling

- Tailwind CSS utility classes
- shadcn/ui components for UI elements
- Custom animations in `tailwind.config.js`:
  - `disc-flip` - 3D rotation animation (600ms ease-in-out)
  - `gentle-glow` - Pulsing glow effect for UI elements
  - `pulse-ring` - Animated ring for valid moves
- Color scheme:
  - Player (You): Black (`from-slate-700 to-slate-900`)
  - Coop: White (`from-white to-gray-100`)
  - Board: Green (`from-green-800 via-green-700 to-green-900`)
- Backface visibility utilities for 3D flips
- Responsive design with mobile support

## Game Implementation Details

### How Othello Works

**Objective**: Capture more discs than your opponent

**Setup**:
- 8x8 grid
- Four discs in center (White-Black / Black-White)
- Black (Player) moves first

**Gameplay**:
1. Click a valid cell to place your disc
2. You must flank at least one opponent disc
3. All flanked discs flip to your color
4. If you have no valid moves, turn is skipped
5. Game ends when neither player can move
6. **Win condition**: Most discs wins

**Strategy**:
- **Corners are king** - Can never be flipped
- **Avoid X-squares** - Diagonally adjacent to empty corners
- **Edges are good** - Harder to flip than center
- **Mobility matters** - Keep options open

### Code Organization

- **Separation of Concerns**: Game logic separate from UI
- **Type Safety**: Full TypeScript coverage with strict mode
- **Immutability**: Game state updates use immutable patterns
- **Performance**: Minimax depth limited to 6 for responsive AI
- **React 19 Compliance**: Pure render functions, proper hook dependencies
- **Security**: localStorage validation, no XSS vulnerabilities
- **Extensibility**: Easy to add new Coop personalities or features

## Recent Improvements & Bug Fixes

### Disc Rendering Fix (Latest)

**Fixed Critical 3D Transform Bug** - Resolved issue where all discs appeared black or white discs were invisible:
- ✅ **Root Cause**: Inline `transform` style conflicting with CSS classes
- ✅ **Solution**: Rotate the container element instead of managing visibility with z-index
- ✅ **Implementation**:
  - Player 1 (Black): Container at 0° rotation
  - Player 2 (White): Container at 180° rotation
  - Both sides use `backface-visibility: hidden` for proper 3D rendering
- ✅ **Result**: Both black and white discs now display correctly with smooth flip animations

### Production-Ready Features

- ✅ **React 19 Compliance**: Pure renders, proper hooks, cleanup
- ✅ **useEffect Dependencies**: Fixed stale closures in AI move scheduling
- ✅ **Memory Leak Prevention**: Proper timeout cleanup in animations and AI moves
- ✅ **localStorage Validation**: Type guards prevent crashes from corrupted data
- ✅ **Type Safety**: No `any` types, proper webkit AudioContext typing
- ✅ **3D Animations**: Backface-hidden CSS for smooth disc flips

### TypeScript Configuration

- Strict mode enabled for maximum type safety
- Path aliases configured: `@/*` maps to `./src/*`
- React 19 JSX transform
- Module resolution: "bundler" for Vite compatibility
- Type declarations for Vite environment

### Code Quality Tools

- Type checking with `npm run type-check`
- ESLint 9 with React hooks plugin and flat config
- Prettier for code formatting with Tailwind plugin
- Production build validation before deployment

## Important Notes for WSL + Windows Filesystem

This project includes workarounds for WSL development:

1. **Always use `--no-bin-links`** when running `npm install`
2. **Scripts run through node_modules** or **npm scripts**
3. **Port Configuration**: Dev server uses port 3002 by default, but will auto-increment (3003, 3004, etc.) if port is busy

## Deployment

Build for production and deploy the `dist/` folder to www.mcooper.com:

```bash
npm run build               # Creates optimized production build
# Deploy dist/ folder to web server
```

**Build Output**:
- Single-page application (SPA)
- HashRouter for client-side routing
- No backend required - all game logic runs client-side
- Gzipped bundle: ~122KB

**SEO & Meta**:
- Title: "Othello - Classic Strategy Game | M. Cooper"
- Description: "Play Othello (Reversi) online with AI opponents! Choose your opponent's difficulty: Sleepy Coop, Caffeinated Coop, or Bentley - The Mastermind. Features smooth disc-flipping animations and stat tracking."
- Designed by M. Cooper for www.mcooper.com

## Portfolio Highlights

This project demonstrates:

- **Classic Board Game AI**: Sophisticated minimax implementation
- **React 19 Best Practices**: Pure renders, proper hooks, cleanup
- **Type Safety**: Full TypeScript with guards and validation
- **Performance**: Optimized animations, efficient AI (60fps)
- **Animation Engineering**: 3D CSS transforms, timing functions
- **Web Audio API**: Dynamic sound generation
- **Accessibility**: Keyboard controls, ARIA labels, valid move indicators
- **Code Quality**: ESLint 9, Prettier, zero TypeScript errors
- **User Engagement**: Rotating messages, humor, personality

## Technology Versions

- React: 19.2.0
- TypeScript: 5.7.3
- Vite: 5.4.21
- Tailwind CSS: 3.4.18
- React Router: 7.2.0
- shadcn/ui: Latest via CLI

All dependencies are set to stable versions as of January 2025.

## Branding & Theming

**Tagline**: "Play Coop • Can you beat Coop?"

**Coop's Personality Levels**:
1. 😴 Sleepy Coop - "Hung over and barely functional"
2. 🤓 Caffeinated Coop - "Coffee powered"
3. 🐺 Bentley - The Mastermind - "Bringing everything"

**Message Themes**:
- Disc-flipping jokes
- Corner control strategy references
- Edgy but playful trash talk
- Celebrates player skill appropriately
- Roasts losses with humor, not cruelty
- Makes the AI feel like a character, not just code

This creates an engaging, memorable gaming experience that showcases both technical skill and creative design.
