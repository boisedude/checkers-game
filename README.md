# Checkers - Play Coop!

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)

A classic Checkers (Draughts) game with personality-driven AI opponents. Challenge Bella, Coop, or Bentley in this traditional board game featuring jumping mechanics, king pieces, smooth animations, and character-based gameplay.

![Screenshot](screenshot.png)

## Features

- **Classic Checkers Gameplay** - Authentic American Checkers rules on an 8x8 board with forced captures
- **AI Opponents with Personality** - Three difficulty levels featuring unique characters:
  - **Bella - The Playful Pup** (Easy): Sweet and enthusiastic, still learning the ropes
  - **Coop - The Casual Challenger** (Medium): Friendly arcade owner with solid strategy
  - **Bentley - The Mastermind** (Hard): The arcade champion, a deep-searching engine that punishes loose moves
- **Jumping Mechanics** - Capture opponent pieces by jumping over them, with multi-jump support
- **King Pieces** - Regular pieces become kings when reaching the opposite end, gaining backward movement
- **Smooth Animations** - Beautiful piece movement animations with CSS transforms
- **Comprehensive Stats Tracking** - Win/loss records, win streaks, largest margins, and more
- **Web Audio API Sound Effects** - Dynamic sounds for piece placement, captures, victory, and defeat
- **Victory Dialogs with Personality** - Character-specific catchphrases based on game outcome
- **Local Persistence** - Game state and statistics saved in localStorage with validation
- **Keyboard Controls** - Full keyboard support for accessibility
- **Responsive Design** - Optimized for desktop and tablet

## Technology Stack

- **React 19** with TypeScript - Modern React with strict mode compliance
- **Vite 5** - Lightning-fast build tool and development server
- **Tailwind CSS + shadcn/ui** - Beautiful, accessible component library
- **React Router 7** - Client-side routing with HashRouter
- **Web Audio API** - Dynamic sound effect generation
- **Error Boundaries** - Graceful error handling and recovery

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/checkers-game.git
cd checkers-game

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript compiler
```

## How to Play Checkers

**Objective**: Capture all of your opponent's pieces or block them so they cannot move.

**Setup**:
- 8x8 board with alternating dark and light squares
- 12 red pieces (bottom) vs 12 black pieces (top)
- Pieces are placed only on dark squares

**Gameplay Rules**:
1. **Movement**: Regular pieces move diagonally forward one square to an empty dark square
2. **Capturing**: Jump diagonally over an opponent's piece to an empty square beyond it
3. **Forced Captures**: If you can capture, you must capture (no choice)
4. **Multi-Jumps**: If after capturing you can jump again, you must continue jumping
5. **King Me**: When a piece reaches the opposite end of the board, it becomes a king
6. **King Movement**: Kings can move and capture both forward and backward diagonally
7. **Winning**: Capture all opponent pieces or block them from making any legal moves

**Strategic Tips**:
- Control the center of the board early in the game
- Protect your back row to prevent opponent from kinging easily
- Kings are powerful - try to create them while preventing opponent kings
- Force your opponent into disadvantageous positions
- Plan multi-jump sequences to capture multiple pieces

## AI Difficulty Levels

### Easy - Bella (The Playful Pup)
- Plays a random move 30% of the time
- Otherwise a 2-ply search that only counts material
- Perfect for learning the game rules

### Medium - Coop (The Casual Challenger)
- The same engine as Bentley, limited to 4 plies plus forced captures
- Picks at random among moves within a quarter of a man of the best
- Provides a fair challenge for intermediate players

### Hard - Bentley (The Mastermind)
- Engine in `src/lib/engine.ts`, run in a web worker with about 700 ms per move
- Board as three 32-bit masks; iterative deepening alpha-beta (PVS) with a
  transposition table, killer and history move ordering, and late move reductions
- Never stops searching while a capture is pending, so it does not miss shots at the horizon
- Typically searches 15 to 18 plies in the middlegame
- Evaluation: material (king about 1.35 men), trading down when ahead, back rank guard,
  advancement, centre, dog holes, blocked men, king mobility, men with a clear run to the
  crown row, and endgame technique (driving kings out of the double corner)
- Knows the draw rules (3-fold repetition, 80 plies without a capture or promotion)
- Varies its choice among equally good moves early in the game
- The Hint button asks the same engine for 400 ms

## Project Structure

```
checkers/
├── src/
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── Board.tsx                # 8x8 checkers board
│   │   ├── Cell.tsx                 # Individual cell component
│   │   ├── Piece.tsx                # Animated piece (regular/king)
│   │   ├── GameControls.tsx         # Character selector and controls
│   │   ├── VictoryDialog.tsx        # End game dialog with personality
│   │   └── LeaderboardDialog.tsx    # Stats and leaderboard
│   ├── hooks/
│   │   ├── useCheckersGame.ts       # Game state management
│   │   ├── useCharacterSelection.ts # Character/difficulty management
│   │   ├── useLeaderboard.ts        # Stats and leaderboard logic
│   │   ├── useBentleyStats.ts       # Bentley-specific statistics
│   │   └── useGameAudio.ts          # Web Audio API sounds
│   ├── lib/
│   │   ├── checkersRules.ts         # Game rules engine
│   │   ├── aiStrategies.ts          # Bella, Coop and Bentley entry point
│   │   ├── engine.ts                # Bentley's search and evaluation
│   │   └── utils.ts                 # Utility functions
│   ├── types/
│   │   └── checkers.types.ts        # TypeScript type definitions
│   ├── App.tsx                      # Main app with routing
│   └── main.tsx                     # Entry point
├── shared/
│   └── characters.ts                # Character definitions and catchphrases
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Statistics Tracked

The leaderboard system tracks comprehensive statistics:

- **Total Games**: Wins + Losses + Draws
- **Win Rate**: Percentage of games won
- **Win Streak**: Current consecutive wins
- **Longest Streak**: Best win streak ever achieved
- **Largest Margin**: Biggest piece count difference in a win
- **Total Pieces Captured**: Cumulative across all games
- **Character-Specific Stats**: Track performance against each AI opponent

## Characters

### Bella - The Playful Pup
- **Personality**: Enthusiastic, easily distracted, just wants to have fun
- **Playing Style**: Random moves, gets distracted by virtual squirrels
- **Backstory**: Bentley's little sister who just wants to play games and get treats
- **Catchphrases**: "Ooh, shiny! Let's play!", "Wait, what are we playing again?"

### Coop - The Casual Challenger
- **Personality**: Laid-back gamer who knows his games but plays for fun
- **Playing Style**: Solid strategy, makes good moves but not perfect
- **Backstory**: The arcade owner who's been gaming his whole life
- **Catchphrases**: "Let's see what you've got!", "Good luck out there!"

### Bentley - The Mastermind
- **Personality**: Ruthless strategist who plays to win
- **Playing Style**: Perfect strategy, thinks 6 moves ahead, shows no mercy
- **Backstory**: The legendary arcade champion. Nobody beats Bentley... or do they?
- **Catchphrases**: "Calculated.", "Don't waste my time."

## Deployment

Build the production bundle:

```bash
npm run build
```

The `dist/` folder contains all static assets ready to deploy to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Or any web server

The application is a single-page app (SPA) with no backend requirements. All game logic runs client-side.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

- Follow the existing code style (use Prettier and ESLint)
- Ensure TypeScript has no errors (`npm run type-check`)
- Test your changes thoroughly
- Update documentation as needed

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Credits

Created by M. Cooper for [www.mcooper.com](https://www.mcooper.com)

---

**Checkers - Play Coop! Can you beat Bentley?**
