/**
 * Checkers engine (Bentley, Coop and the hint).
 *
 * Pure TypeScript, no DOM. The board is three 32-bit masks (red, black, kings)
 * over the 32 dark squares, index = row * 4 + floor(col / 2), so index + 1 is the
 * standard 1-32 square number. Red (player 1) moves toward row 0, black
 * (player 2) toward row 7.
 *
 * Rules match checkersRules.ts exactly: any capture is forced (not the longest),
 * a multi-jump is one move and must be finished, captured pieces leave the board
 * as they are jumped, a man that reaches the crown row stops there, a side with
 * no move loses, and the game is drawn after 80 plies without a capture or
 * promotion or when a position (with the same side to move) occurs a third time.
 *
 * Search: iterative deepening negamax with principal variation search, a
 * Zobrist transposition table in typed arrays, TT move, killer and history
 * ordering, late move reductions for quiet moves, and a capture quiescence (a
 * position whose side to move has a capture is never evaluated; when the other
 * side threatens one, one more quiet ply is searched).
 */

import type { Board, Player, ValidMove } from '@/types/checkers.types'
import { getAllValidMoves } from '@/lib/checkersRules'
import { DRAW_MOVE_LIMIT, REPETITION_DRAW_COUNT } from '@/lib/gameConstants'

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** Square index for a dark (row, col), or -1. */
export function squareOf(row: number, col: number): number {
  if (row < 0 || row > 7 || col < 0 || col > 7 || (row + col) % 2 === 0) return -1
  return row * 4 + (col >> 1)
}
export function rowOf(s: number): number {
  return s >> 2
}
export function colOf(s: number): number {
  const r = s >> 2
  return (r & 1) === 0 ? 2 * (s & 3) + 1 : 2 * (s & 3)
}

// Directions: 0 up-left, 1 up-right (red men), 2 down-left, 3 down-right (black men).
const DR = [-1, -1, 1, 1]
const DC = [-1, 1, -1, 1]
const NB = new Int8Array(4 * 32).fill(-1)
const JMP = new Int8Array(4 * 32).fill(-1)
for (let s = 0; s < 32; s++) {
  const r = rowOf(s)
  const c = colOf(s)
  for (let d = 0; d < 4; d++) {
    NB[d * 32 + s] = squareOf(r + DR[d], c + DC[d])
    const n = NB[d * 32 + s]
    JMP[d * 32 + s] = n >= 0 ? squareOf(r + 2 * DR[d], c + 2 * DC[d]) : -1
  }
}

/**
 * Shift tables for set-wise generation. For direction d, a neighbour offset is
 * one of two values depending on row parity; SH_OFF/SH_MASK hold those two
 * (offset, source mask) pairs. Jump landings have a single offset per direction.
 */
const SH_OFF = new Int32Array(8)
const SH_MASK = new Int32Array(8)
const J_OFF = new Int32Array(4)
const J_MASK = new Int32Array(4)
for (let d = 0; d < 4; d++) {
  const offs: number[] = []
  const masks: number[] = []
  let jm = 0
  for (let s = 0; s < 32; s++) {
    const n = NB[d * 32 + s]
    if (n >= 0) {
      const o = n - s
      let i = offs.indexOf(o)
      if (i < 0) {
        offs.push(o)
        masks.push(0)
        i = offs.length - 1
      }
      masks[i] |= 1 << s
    }
    const l = JMP[d * 32 + s]
    if (l >= 0) {
      J_OFF[d] = l - s
      jm |= 1 << s
    }
  }
  for (let i = 0; i < 2; i++) {
    SH_OFF[d * 2 + i] = offs[i] ?? 0
    SH_MASK[d * 2 + i] = masks[i] ?? 0
  }
  J_MASK[d] = jm
}

function shift(x: number, o: number): number {
  return o >= 0 ? x << o : x >>> -o
}

/** Squares in `src` whose neighbour in direction d is in `target`. */
function hasNb(src: number, target: number, d: number): number {
  const o0 = SH_OFF[d * 2]
  const o1 = SH_OFF[d * 2 + 1]
  return (
    ((src & SH_MASK[d * 2] & shift(target, -o0)) | (src & SH_MASK[d * 2 + 1] & shift(target, -o1))) | 0
  )
}

/** Squares in `src` that can jump in direction d over `opp` into `empty`. */
function canJump(src: number, opp: number, empty: number, d: number): number {
  return (hasNb(src & J_MASK[d], opp, d) & shift(empty, -J_OFF[d])) | 0
}

function popcount(x: number): number {
  x = x - ((x >>> 1) & 0x55555555)
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
  x = (x + (x >>> 4)) & 0x0f0f0f0f
  return Math.imul(x, 0x01010101) >>> 24
}
function lowBit(x: number): number {
  return 31 - Math.clz32(x & -x)
}

const ROW_MASK = new Int32Array(8)
for (let s = 0; s < 32; s++) ROW_MASK[rowOf(s)] |= 1 << s
const CROWN = [ROW_MASK[0], ROW_MASK[7]] // side 0 = red crowns on row 0, side 1 = black on row 7

// ---------------------------------------------------------------------------
// Move generation
// ---------------------------------------------------------------------------

const MAX_PLY = 128
const MAX_MOVES = 96
const mvFrom = new Int8Array(MAX_PLY * MAX_MOVES)
const mvTo = new Int8Array(MAX_PLY * MAX_MOVES)
const mvCap = new Int32Array(MAX_PLY * MAX_MOVES)
const mvScore = new Int32Array(MAX_PLY * MAX_MOVES)

let genCount = 0
let genBase = 0

function addMove(from: number, to: number, cap: number): void {
  if (cap !== 0) {
    // Two jump paths can capture the same pieces and end on the same square; they are one move.
    for (let i = genBase; i < genBase + genCount; i++) {
      if (mvFrom[i] === from && mvTo[i] === to && mvCap[i] === cap) return
    }
  }
  if (genCount >= MAX_MOVES) return
  const i = genBase + genCount++
  mvFrom[i] = from
  mvTo[i] = to
  mvCap[i] = cap
}

function jumpRec(from: number, cur: number, king: boolean, side: number, opp: number, empty: number, cap: number): void {
  let found = false
  const d0 = king ? 0 : side === 0 ? 0 : 2
  const d1 = king ? 4 : d0 + 2
  for (let d = d0; d < d1; d++) {
    const n = NB[d * 32 + cur]
    const l = JMP[d * 32 + cur]
    if (l < 0 || ((opp >>> n) & 1) === 0 || ((empty >>> l) & 1) === 0) continue
    found = true
    const nb = 1 << n
    const nCap = cap | nb
    if (!king && ((CROWN[side] >>> l) & 1) !== 0) {
      addMove(from, l, nCap)
      continue
    }
    jumpRec(from, l, king, side, opp & ~nb, (empty | nb | (1 << cur)) & ~(1 << l), nCap)
  }
  if (!found && cap !== 0) addMove(from, cur, cap)
}

/**
 * Generates the legal moves for `side` into slot `ply`. Returns the count and
 * whether they are captures (if any capture exists, only captures are legal).
 */
function generate(ply: number, side: number, me: number, opp: number, kings: number): number {
  genBase = ply * MAX_MOVES
  genCount = 0
  const empty = ~(me | opp)
  const myKings = me & kings
  const fwd0 = side === 0 ? 0 : 2
  // Captures first
  let jumpers = 0
  for (let d = 0; d < 4; d++) {
    const src = d === fwd0 || d === fwd0 + 1 ? me : myKings
    jumpers |= canJump(src, opp, empty, d)
  }
  if (jumpers !== 0) {
    let j = jumpers
    while (j !== 0) {
      const s = lowBit(j)
      j &= j - 1
      jumpRec(s, s, ((kings >>> s) & 1) !== 0, side, opp, empty, 0)
    }
    return genCount
  }
  for (let d = 0; d < 4; d++) {
    const src = d === fwd0 || d === fwd0 + 1 ? me : myKings
    for (let k = 0; k < 2; k++) {
      const o = SH_OFF[d * 2 + k]
      const m = SH_MASK[d * 2 + k]
      let dest = (shift(src & m, o) & empty) | 0
      while (dest !== 0) {
        const t = lowBit(dest)
        dest &= dest - 1
        addMove(t - o, t, 0)
      }
    }
  }
  return genCount
}

/** True if `side` has any capture available. */
function hasCapture(side: number, me: number, opp: number, kings: number): boolean {
  const empty = ~(me | opp)
  const myKings = me & kings
  const fwd0 = side === 0 ? 0 : 2
  for (let d = 0; d < 4; d++) {
    const src = d === fwd0 || d === fwd0 + 1 ? me : myKings
    if (canJump(src, opp, empty, d) !== 0) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Zobrist hashing (two 32-bit halves)
// ---------------------------------------------------------------------------

// piece kinds: 0 red man, 1 red king, 2 black man, 3 black king
const ZLO = new Int32Array(4 * 32)
const ZHI = new Int32Array(4 * 32)
let ZSIDE_LO = 0
let ZSIDE_HI = 0
{
  let seed = 0x9e3779b9 | 0
  const rnd = () => {
    // xorshift32
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return seed | 0
  }
  for (let i = 0; i < 128; i++) {
    ZLO[i] = rnd()
    ZHI[i] = rnd()
  }
  ZSIDE_LO = rnd()
  ZSIDE_HI = rnd()
}

function hashPosition(red: number, black: number, kings: number, side: number): [number, number] {
  let lo = 0
  let hi = 0
  for (let s = 0; s < 32; s++) {
    const b = 1 << s
    let k = -1
    if (red & b) k = kings & b ? 1 : 0
    else if (black & b) k = kings & b ? 3 : 2
    if (k >= 0) {
      lo ^= ZLO[k * 32 + s]
      hi ^= ZHI[k * 32 + s]
    }
  }
  if (side === 1) {
    lo ^= ZSIDE_LO
    hi ^= ZSIDE_HI
  }
  return [lo | 0, hi | 0]
}

// ---------------------------------------------------------------------------
// Transposition table
// ---------------------------------------------------------------------------

const TT_BITS = 19
const TT_SIZE = 1 << TT_BITS
const TT_MASK = TT_SIZE - 1
const ttLock = new Int32Array(TT_SIZE)
const ttScore = new Int16Array(TT_SIZE)
const ttDepth = new Int8Array(TT_SIZE)
const ttFlag = new Uint8Array(TT_SIZE) // 0 empty, 1 exact, 2 lower, 3 upper
const ttMove = new Int16Array(TT_SIZE) // from | to << 5, -1 none
const ttCap = new Int32Array(TT_SIZE)
const FLAG_EXACT = 1
const FLAG_LOWER = 2
const FLAG_UPPER = 3

function clearTT(): void {
  ttFlag.fill(0)
}

// ---------------------------------------------------------------------------
// Evaluation (score for the side to move; a man is 100)
// ---------------------------------------------------------------------------

const MAN = 100
const KING = 135
export const MATE = 30000
const MATE_BOUND = MATE - 1000
const INF = 32000

// Back rank men worth keeping while the opponent still has men that could crown.
// Red's back rank is row 7 (squares 29-32), black's is row 0 (squares 1-4); the bridge is 30+32 / 1+3.
const BACK_RED = new Int32Array(32)
const BACK_BLACK = new Int32Array(32)
BACK_RED[28] = 3
BACK_RED[29] = 8
BACK_RED[30] = 4
BACK_RED[31] = 7
BACK_BLACK[3] = 3
BACK_BLACK[2] = 8
BACK_BLACK[1] = 4
BACK_BLACK[0] = 7
const BRIDGE_RED = (1 << 29) | (1 << 31)
const BRIDGE_BLACK = (1 << 0) | (1 << 2)
const CENTER = (1 << 13) | (1 << 14) | (1 << 17) | (1 << 18)
const NEAR_CENTER = (1 << 9) | (1 << 10) | (1 << 21) | (1 << 22) | (1 << 12) | (1 << 19)
const DOUBLE_CORNER_TL = (1 << 0) | (1 << 4)
const DOUBLE_CORNER_BR = (1 << 27) | (1 << 31)
const DOUBLE_CORNERS = DOUBLE_CORNER_TL | DOUBLE_CORNER_BR
const EDGES = (() => {
  let m = 0
  for (let s = 0; s < 32; s++) if (colOf(s) === 0 || colOf(s) === 7) m |= 1 << s
  return m
})()

/** Forward cone of each square: every square a man there could reach on the way to its crown row. */
const CONE_RED = new Int32Array(32)
const CONE_BLACK = new Int32Array(32)
for (let s = 0; s < 32; s++) {
  const r = rowOf(s)
  const c = colOf(s)
  for (let t = 0; t < 32; t++) {
    const tr = rowOf(t)
    const tc = colOf(t)
    if (tr < r && Math.abs(tc - c) <= r - tr) CONE_RED[s] |= 1 << t
    if (tr > r && Math.abs(tc - c) <= tr - r) CONE_BLACK[s] |= 1 << t
  }
}

function sqDist(a: number, b: number): number {
  return Math.max(Math.abs(rowOf(a) - rowOf(b)), Math.abs(colOf(a) - colOf(b)))
}
const DIST = new Int8Array(32 * 32)
for (let a = 0; a < 32; a++) for (let b = 0; b < 32; b++) DIST[a * 32 + b] = sqDist(a, b)

/** Men that have no forward step (blocked), for each side. */
function immobileMen(men: number, empty: number, side: number): number {
  const d0 = side === 0 ? 0 : 2
  return men & ~(hasNb(men, empty, d0) | hasNb(men, empty, d0 + 1))
}

function kingMobility(k: number, empty: number): number {
  let m = 0
  for (let d = 0; d < 4; d++) m += popcount(hasNb(k, empty, d))
  return m
}

/** Score from red's point of view. */
function evaluateRed(red: number, black: number, kings: number): number {
  const rm = red & ~kings
  const rk = red & kings
  const bm = black & ~kings
  const bk = black & kings
  const nrm = popcount(rm)
  const nrk = popcount(rk)
  const nbm = popcount(bm)
  const nbk = popcount(bk)
  const total = nrm + nrk + nbm + nbk
  const redMat = nrm * MAN + nrk * KING
  const blackMat = nbm * MAN + nbk * KING
  const diff = redMat - blackMat
  let score = diff
  // Trade down when ahead: the same lead is worth more with less on the board.
  score += ((diff * 150) / (redMat + blackMat + 1)) | 0

  const empty = ~(red | black)
  const endgame = total <= 10
  const midScale = total > 16 ? 1 : total > 10 ? 2 : 3

  // Men: advancement, centre, runaways
  let pos = 0
  let m = rm
  while (m !== 0) {
    const s = lowBit(m)
    m &= m - 1
    const adv = 7 - rowOf(s)
    pos += adv * midScale
    if ((CONE_RED[s] & black) === 0) pos += 60 - 7 * rowOf(s) // nothing can stop it from crowning
  }
  m = bm
  while (m !== 0) {
    const s = lowBit(m)
    m &= m - 1
    const adv = rowOf(s)
    pos -= adv * midScale
    if ((CONE_BLACK[s] & red) === 0) pos -= 60 - 7 * (7 - rowOf(s))
  }
  pos += 4 * (popcount(rm & CENTER) - popcount(bm & CENTER))
  pos += 1 * (popcount(rm & NEAR_CENTER) - popcount(bm & NEAR_CENTER))
  pos -= 2 * (popcount(rm & EDGES) - popcount(bm & EDGES)) * (total > 16 ? 1 : 0)

  // Back rank guard while the other side still has men
  if (nbm > 0) {
    let b = rm & ROW_MASK[7]
    let g = 0
    while (b !== 0) {
      const s = lowBit(b)
      b &= b - 1
      g += BACK_RED[s]
    }
    if ((rm & BRIDGE_RED) === BRIDGE_RED) g += 6
    pos += total > 12 ? g : g >> 1
  }
  if (nrm > 0) {
    let b = bm & ROW_MASK[0]
    let g = 0
    while (b !== 0) {
      const s = lowBit(b)
      b &= b - 1
      g += BACK_BLACK[s]
    }
    if ((bm & BRIDGE_BLACK) === BRIDGE_BLACK) g += 6
    pos -= total > 12 ? g : g >> 1
  }

  // Dog holes: red man on 5 behind a black man on 1; black man on 28 behind a red man on 32.
  if ((rm & (1 << 4)) !== 0 && (bm & (1 << 0)) !== 0) pos -= 10
  if ((bm & (1 << 27)) !== 0 && (rm & (1 << 31)) !== 0) pos += 10
  // Blocked men
  pos -= 3 * (popcount(immobileMen(rm, empty, 0)) - popcount(immobileMen(bm, empty, 1)))

  // Kings: mobility, centre, trapped
  if (nrk + nbk > 0) {
    const rkMob = kingMobility(rk, empty)
    const bkMob = kingMobility(bk, empty)
    pos += 2 * (rkMob - bkMob)
    pos += 6 * (popcount(rk & CENTER) - popcount(bk & CENTER))
    pos += 2 * (popcount(rk & NEAR_CENTER) - popcount(bk & NEAR_CENTER))
    pos -= 6 * (popcount(rk & EDGES) - popcount(bk & EDGES))
  }

  // Endgame technique
  if (diff !== 0 && (endgame || nrk + nbk > 0)) {
    const strongRed = diff > 0
    const strongK = strongRed ? rk : bk
    const weak = strongRed ? black : red
    const weakK = strongRed ? bk : rk
    let e = 0
    // Stronger kings close in on the weaker pieces.
    let k = strongK
    while (k !== 0) {
      const s = lowBit(k)
      k &= k - 1
      let best = 8
      let w = weak
      while (w !== 0) {
        const t = lowBit(w)
        w &= w - 1
        const dd = DIST[s * 32 + t]
        if (dd < best) best = dd
      }
      e -= 4 * best
    }
    // The weaker side wants its kings in a double corner; the stronger side wants them out.
    e -= 14 * popcount(weakK & DOUBLE_CORNERS)
    // Fewer weak pieces in total: drive toward the finish.
    e -= 3 * popcount(weak)
    pos += strongRed ? e : -e
  }

  return score + pos
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const killerA = new Int32Array(MAX_PLY)
const killerB = new Int32Array(MAX_PLY)
const historyTable = new Int32Array(2 * 32 * 32)
const repLo = new Int32Array(512 + MAX_PLY)
const repHi = new Int32Array(512 + MAX_PLY)
let repLen = 0

let nodes = 0
let nodeLimit = 0
let deadline = 0
let aborted = false
let canAbort = false
let selDepth = 0

const now: () => number =
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now()

function moveKey(from: number, to: number): number {
  return from | (to << 5)
}

function scoreToTT(score: number, ply: number): number {
  if (score > MATE_BOUND) return score + ply
  if (score < -MATE_BOUND) return score - ply
  return score
}
function scoreFromTT(score: number, ply: number): number {
  if (score > MATE_BOUND) return score - ply
  if (score < -MATE_BOUND) return score + ply
  return score
}

/** Number of times the current position (top of the stack) occurs within the reversible window. */
function repetitions(counter: number): number {
  const top = repLen - 1
  const lo = repLo[top]
  const hi = repHi[top]
  let n = 1
  const stop = Math.max(0, top - counter)
  for (let i = top - 2; i >= stop; i -= 2) {
    if (repLo[i] === lo && repHi[i] === hi) n++
  }
  return n
}

function checkTime(): void {
  if (!canAbort) return
  if (nodes >= nodeLimit || ((nodes & 1023) === 0 && now() >= deadline)) aborted = true
}

function search(
  me: number,
  opp: number,
  kings: number,
  side: number,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  hLo: number,
  hHi: number,
  counter: number,
  quietExt: number
): number {
  nodes++
  if ((nodes & 1023) === 0 || nodes >= nodeLimit) checkTime()
  if (aborted) return 0
  if (ply > selDepth) selDepth = ply

  const count = generate(ply, side, me, opp, kings)
  if (count === 0) return -(MATE - ply)
  if (counter >= DRAW_MOVE_LIMIT) return 0
  if (repetitions(counter) >= REPETITION_DRAW_COUNT) return 0
  if (ply >= MAX_PLY - 2) {
    const e = evaluateRed(side === 0 ? me : opp, side === 0 ? opp : me, kings)
    return side === 0 ? e : -e
  }
  // Mate distance pruning
  const mateHere = MATE - ply
  if (alpha < -mateHere) alpha = -mateHere
  if (beta > mateHere - 1) beta = mateHere - 1
  if (alpha >= beta) return alpha

  const base = ply * MAX_MOVES
  const isCapture = mvCap[base] !== 0

  if (depth <= 0 && !isCapture) {
    // Quiet for the side to move. If the opponent is threatening a capture, look one quiet ply further.
    if (quietExt > 0 && hasCapture(side ^ 1, opp, me, kings)) {
      depth = 1
      quietExt--
    } else {
      const e = evaluateRed(side === 0 ? me : opp, side === 0 ? opp : me, kings)
      return side === 0 ? e : -e
    }
  }

  // Transposition table
  const ti = hLo & TT_MASK
  let ttMv = -1
  let ttCp = 0
  if (ttFlag[ti] !== 0 && ttLock[ti] === hHi) {
    ttMv = ttMove[ti]
    ttCp = ttCap[ti]
    // The 80-ply rule and repetitions make scores path dependent; trust the table only far from them.
    if (ttDepth[ti] >= depth && counter < 40) {
      const s = scoreFromTT(ttScore[ti], ply)
      const f = ttFlag[ti]
      if (f === FLAG_EXACT || (f === FLAG_LOWER && s >= beta) || (f === FLAG_UPPER && s <= alpha)) return s
    }
  }

  // Order moves
  const hBase = side * 1024
  const ka = killerA[ply]
  const kb = killerB[ply]
  for (let i = base; i < base + count; i++) {
    const f = mvFrom[i]
    const t = mvTo[i]
    const key = moveKey(f, t)
    let sc: number
    if (key === ttMv && mvCap[i] === ttCp) sc = 1 << 30
    else if (isCapture) sc = (1 << 24) + popcount(mvCap[i]) * 4096 + popcount(mvCap[i] & kings) * 1024
    else {
      sc = historyTable[hBase + f * 32 + t]
      if (key === ka) sc += 1 << 22
      else if (key === kb) sc += 1 << 21
      if (((kings >>> f) & 1) === 0 && ((CROWN[side] >>> t) & 1) !== 0) sc += 1 << 23
    }
    mvScore[i] = sc
  }

  const crownMask = CROWN[side]
  const alphaOrig = alpha
  let bestScore = -INF
  let bestFrom = -1
  let bestTo = -1
  let bestCap = 0

  for (let n = 0; n < count; n++) {
    // Selection sort step: bring the best remaining move to position n
    let bi = base + n
    for (let i = bi + 1; i < base + count; i++) if (mvScore[i] > mvScore[bi]) bi = i
    const j = base + n
    if (bi !== j) {
      const f0 = mvFrom[j], t0 = mvTo[j], c0 = mvCap[j], s0 = mvScore[j]
      mvFrom[j] = mvFrom[bi]
      mvTo[j] = mvTo[bi]
      mvCap[j] = mvCap[bi]
      mvScore[j] = mvScore[bi]
      mvFrom[bi] = f0
      mvTo[bi] = t0
      mvCap[bi] = c0
      mvScore[bi] = s0
    }
    const from = mvFrom[j]
    const to = mvTo[j]
    const cap = mvCap[j]
    const fb = 1 << from
    const tb = 1 << to
    const wasKing = (kings & fb) !== 0
    const promote = !wasKing && (crownMask & tb) !== 0
    const newMe = (me & ~fb) | tb
    const newOpp = opp & ~cap
    let newKings = kings & ~fb & ~cap
    if (wasKing || promote) newKings |= tb

    // Incremental hash
    const myKind = side * 2
    const oppKind = (side ^ 1) * 2
    const fk = myKind + (wasKing ? 1 : 0)
    const tk = myKind + (wasKing || promote ? 1 : 0)
    let lo = hLo ^ ZLO[fk * 32 + from] ^ ZLO[tk * 32 + to] ^ ZSIDE_LO
    let hi = hHi ^ ZHI[fk * 32 + from] ^ ZHI[tk * 32 + to] ^ ZSIDE_HI
    let c = cap
    while (c !== 0) {
      const s = lowBit(c)
      c &= c - 1
      const k = oppKind + ((kings >>> s) & 1)
      lo ^= ZLO[k * 32 + s]
      hi ^= ZHI[k * 32 + s]
    }
    const newCounter = cap !== 0 || promote ? 0 : counter + 1
    repLo[repLen] = lo
    repHi[repLen] = hi
    repLen++

    const childDepth = depth - 1
    let score: number
    if (n === 0) {
      score = -search(newOpp, newMe, newKings, side ^ 1, childDepth, -beta, -alpha, ply + 1, lo, hi, newCounter, quietExt)
    } else {
      let r = 0
      // Late move reductions for quiet moves that are not killers or promotions
      if (!isCapture && !promote && depth >= 2 && n >= 2 && mvScore[j] < 1 << 21) {
        r = n >= 5 && depth >= 5 ? 2 : 1
      }
      score = -search(newOpp, newMe, newKings, side ^ 1, childDepth - r, -alpha - 1, -alpha, ply + 1, lo, hi, newCounter, quietExt)
      if (r > 0 && score > alpha && !aborted) {
        score = -search(newOpp, newMe, newKings, side ^ 1, childDepth, -alpha - 1, -alpha, ply + 1, lo, hi, newCounter, quietExt)
      }
      if (score > alpha && score < beta && !aborted) {
        score = -search(newOpp, newMe, newKings, side ^ 1, childDepth, -beta, -alpha, ply + 1, lo, hi, newCounter, quietExt)
      }
    }
    repLen--
    if (aborted) return 0

    if (score > bestScore) {
      bestScore = score
      bestFrom = from
      bestTo = to
      bestCap = cap
      if (score > alpha) {
        alpha = score
        if (alpha >= beta) {
          if (!isCapture) {
            const key = moveKey(from, to)
            if (killerA[ply] !== key) {
              killerB[ply] = killerA[ply]
              killerA[ply] = key
            }
            const hIdx = hBase + from * 32 + to
            historyTable[hIdx] += depth * depth
            if (historyTable[hIdx] > 1 << 20) {
              for (let i = 0; i < historyTable.length; i++) historyTable[i] >>= 1
            }
          }
          break
        }
      }
    }
  }

  const flag = bestScore >= beta ? FLAG_LOWER : bestScore > alphaOrig ? FLAG_EXACT : FLAG_UPPER
  if (ttFlag[ti] === 0 || ttDepth[ti] <= depth || ttLock[ti] !== hHi) {
    ttLock[ti] = hHi
    ttScore[ti] = scoreToTT(bestScore, ply)
    ttDepth[ti] = depth < 0 ? 0 : depth > 127 ? 127 : depth
    ttFlag[ti] = flag
    ttMove[ti] = moveKey(bestFrom, bestTo)
    ttCap[ti] = bestCap
  }
  return bestScore
}

// ---------------------------------------------------------------------------
// Boundary: Board <-> masks
// ---------------------------------------------------------------------------

export interface Masks {
  red: number
  black: number
  kings: number
}

export function boardToMasks(board: Board): Masks {
  let red = 0
  let black = 0
  let kings = 0
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      const s = squareOf(r, c)
      if (!p || s < 0) continue
      if (p.player === 1) red |= 1 << s
      else black |= 1 << s
      if (p.type === 'king') kings |= 1 << s
    }
  }
  return { red, black, kings }
}

/** Parses a checkersRules hashBoard string ("player:cells") into a Zobrist hash. */
function hashFromHistoryString(h: string): [number, number] | null {
  const sep = h.indexOf(':')
  if (sep < 0) return null
  const player = h.slice(0, sep)
  const cells = h.slice(sep + 1)
  if (cells.length !== 64) return null
  let red = 0
  let black = 0
  let kings = 0
  for (let i = 0; i < 64; i++) {
    const ch = cells.charCodeAt(i) - 48
    if (ch === 0) continue
    const s = squareOf(i >> 3, i & 7)
    if (s < 0) continue
    if (ch === 1 || ch === 2) red |= 1 << s
    else black |= 1 << s
    if (ch === 2 || ch === 4) kings |= 1 << s
  }
  return hashPosition(red, black, kings, player === '1' ? 0 : 1)
}

/** Engine move as (from, to, captured mask), the key used to match rules moves. */
export function validMoveKey(m: ValidMove): string {
  let cap = 0
  for (const j of m.jumps) cap |= 1 << squareOf(j.captured.row, j.captured.col)
  return `${squareOf(m.from.row, m.from.col)}:${squareOf(m.to.row, m.to.col)}:${cap | 0}`
}

/** All engine moves for a board, as keys (for agreement tests). */
export function engineMoveKeys(board: Board, player: Player): string[] {
  const { red, black, kings } = boardToMasks(board)
  const side = player === 1 ? 0 : 1
  const n = generate(0, side, side === 0 ? red : black, side === 0 ? black : red, kings)
  const out: string[] = []
  for (let i = 0; i < n; i++) out.push(`${mvFrom[i]}:${mvTo[i]}:${mvCap[i] | 0}`)
  return out
}

/** Static evaluation for `player` (for tests and tools). */
export function evaluateBoard(board: Board, player: Player): number {
  const { red, black, kings } = boardToMasks(board)
  const e = evaluateRed(red, black, kings)
  return player === 1 ? e : -e
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export interface SearchOptions {
  /** Wall-clock budget in ms (default 700). */
  timeMs?: number
  /** Stop after this depth (default 64). With no timeMs given and a maxDepth, the search is deterministic. */
  maxDepth?: number
  /** Node cap; defaults to a multiple of the time budget so a frozen clock cannot hang the search. */
  maxNodes?: number
  /** checkersRules hashBoard strings of the game so far (for the repetition rule). */
  positionHistory?: string[]
  /** Plies since the last capture or promotion (for the 80-ply rule). */
  movesWithoutCaptureOrPromotion?: number
  /** Choose at random among root moves within this many points of the best (0 = always the best). */
  randomMargin?: number
  /**
   * After the search, any root move proven within this many points of the best may be played
   * instead (checked with null-window searches in the time left). Used for opening variety.
   */
  varietyMargin?: number
  /** Score every root move exactly (needed for randomMargin with a fixed depth). */
  exactRoot?: boolean
  /** Called after each completed depth (for tools and tests). */
  onIteration?: (depth: number, score: number, nodes: number, ms: number) => void
  /** Random source for variety (default Math.random). */
  rng?: () => number
}

export interface SearchResult {
  move: ValidMove | null
  score: number
  depth: number
  nodes: number
  timeMs: number
  selDepth: number
}

interface RootMove {
  from: number
  to: number
  cap: number
  score: number
  valid: ValidMove
}

export function searchBestMove(board: Board, player: Player, opts: SearchOptions = {}): SearchResult {
  const start = now()
  const rules = getAllValidMoves(board, player)
  if (rules.length === 0) return { move: null, score: -MATE, depth: 0, nodes: 0, timeMs: 0, selDepth: 0 }

  const { red, black, kings } = boardToMasks(board)
  const side = player === 1 ? 0 : 1
  const me = side === 0 ? red : black
  const opp = side === 0 ? black : red
  const rng = opts.rng ?? Math.random
  const counter = opts.movesWithoutCaptureOrPromotion ?? 0
  const timeMs = opts.timeMs ?? (opts.maxDepth !== undefined ? 1e9 : 700)
  const maxDepth = Math.min(opts.maxDepth ?? 64, 100)

  // Root moves, matched to the rules module's moves.
  const byKey = new Map<string, ValidMove>()
  for (const m of rules) {
    const k = validMoveKey(m)
    if (!byKey.has(k)) byKey.set(k, m)
  }
  const n = generate(0, side, me, opp, kings)
  const roots: RootMove[] = []
  for (let i = 0; i < n; i++) {
    const k = `${mvFrom[i]}:${mvTo[i]}:${mvCap[i] | 0}`
    const valid = byKey.get(k)
    if (valid) roots.push({ from: mvFrom[i], to: mvTo[i], cap: mvCap[i], score: -INF, valid })
  }
  if (roots.length === 0) {
    // Should never happen; the rules module is the authority.
    return { move: rules[0], score: 0, depth: 0, nodes: 0, timeMs: 0, selDepth: 0 }
  }
  if (roots.length === 1) {
    return { move: roots[0].valid, score: 0, depth: 0, nodes: 0, timeMs: now() - start, selDepth: 0 }
  }
  // Shuffle so moves the search scores equal are not always chosen in the same order.
  for (let i = roots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = roots[i]
    roots[i] = roots[j]
    roots[j] = t
  }

  // Repetition stack: the game's positions, ending with the current one.
  const [rootLo, rootHi] = hashPosition(red, black, kings, side)
  repLen = 0
  const hist = opts.positionHistory ?? []
  const keep = Math.min(hist.length, 400, counter + 1)
  for (let i = hist.length - keep; i < hist.length; i++) {
    // An unreadable entry still holds its place so the side-to-move parity stays right.
    const h = hashFromHistoryString(hist[i]) ?? [0x5bd1e995, 0x1b873593]
    repLo[repLen] = h[0]
    repHi[repLen] = h[1]
    repLen++
  }
  if (repLen === 0 || repLo[repLen - 1] !== rootLo || repHi[repLen - 1] !== rootHi) {
    repLo[repLen] = rootLo
    repHi[repLen] = rootHi
    repLen++
  }
  const rootRep = repLen

  clearTT()
  killerA.fill(0)
  killerB.fill(0)
  historyTable.fill(0)
  nodes = 0
  selDepth = 0
  aborted = false
  canAbort = false
  deadline = start + timeMs
  nodeLimit = opts.maxNodes ?? (opts.timeMs !== undefined || opts.maxDepth === undefined ? Math.max(20000, timeMs * 6000) : 2e9)

  const margin = opts.randomMargin ?? 0
  const exact = opts.exactRoot ?? false
  let best = roots[0]
  let bestScore = -INF
  let completed = 0
  const kind = side * 2

  const searchRoot = (rm: RootMove, depth: number, alpha: number, beta: number): number => {
    const fb = 1 << rm.from
    const tb = 1 << rm.to
    const wasKing = (kings & fb) !== 0
    const promote = !wasKing && (CROWN[side] & tb) !== 0
    const newMe = (me & ~fb) | tb
    const newOpp = opp & ~rm.cap
    let newKings = kings & ~fb & ~rm.cap
    if (wasKing || promote) newKings |= tb
    const fk = kind + (wasKing ? 1 : 0)
    const tk = kind + (wasKing || promote ? 1 : 0)
    let lo = rootLo ^ ZLO[fk * 32 + rm.from] ^ ZLO[tk * 32 + rm.to] ^ ZSIDE_LO
    let hi = rootHi ^ ZHI[fk * 32 + rm.from] ^ ZHI[tk * 32 + rm.to] ^ ZSIDE_HI
    let c = rm.cap
    while (c !== 0) {
      const s = lowBit(c)
      c &= c - 1
      const k = (side ^ 1) * 2 + ((kings >>> s) & 1)
      lo ^= ZLO[k * 32 + s]
      hi ^= ZHI[k * 32 + s]
    }
    const newCounter = rm.cap !== 0 || promote ? 0 : counter + 1
    repLen = rootRep
    repLo[repLen] = lo
    repHi[repLen] = hi
    repLen++
    const s = -search(newOpp, newMe, newKings, side ^ 1, depth - 1, -beta, -alpha, 1, lo, hi, newCounter, 1)
    repLen = rootRep
    return s
  }

  for (let depth = 1; depth <= maxDepth; depth++) {
    let alpha = -INF
    const beta = INF
    let iterBest: RootMove | null = null
    let iterScore = -INF
    for (let i = 0; i < roots.length; i++) {
      const rm = roots[i]
      let s: number
      if (exact || i === 0) {
        s = searchRoot(rm, depth, exact ? -INF : alpha, beta)
      } else {
        s = searchRoot(rm, depth, alpha, alpha + 1)
        if (s > alpha && !aborted) s = searchRoot(rm, depth, alpha, beta)
      }
      if (aborted) break
      rm.score = s
      if (s > iterScore) {
        iterScore = s
        iterBest = rm
      }
      if (s > alpha) alpha = s
      if (!exact && s <= iterScore && rm !== iterBest) rm.score = s - 1 // fail-low bound: below the best
    }
    if (aborted) break
    completed = depth
    best = iterBest ?? best
    bestScore = iterScore
    // Order the next iteration: best first, then by this iteration's scores (stable).
    roots.sort((a, b) => (a === best ? -1 : b === best ? 1 : b.score - a.score))
    canAbort = true
    const elapsed = now() - start
    opts.onIteration?.(depth, bestScore, nodes, elapsed)
    if (Math.abs(bestScore) > MATE_BOUND && MATE - Math.abs(bestScore) <= depth) break
    if (opts.maxDepth === undefined && elapsed > timeMs * 0.45) break
  }

  let chosen = best
  const vm = opts.varietyMargin ?? 0
  if (vm > 0 && !aborted && completed >= 2 && Math.abs(bestScore) < MATE_BOUND) {
    const pool = [best]
    canAbort = true
    const bound = bestScore - vm
    for (const r of roots.slice(0, 6)) {
      if (r === best) continue
      const s = searchRoot(r, completed, bound - 1, bound)
      if (aborted) break
      if (s >= bound) pool.push(r)
    }
    aborted = false
    chosen = pool[Math.floor(rng() * pool.length)]
  }
  if (margin > 0 && exact) {
    const pool = roots.filter(r => r.score >= bestScore - margin)
    if (pool.length > 0) chosen = pool[Math.floor(rng() * pool.length)]
  }

  return {
    move: chosen.valid,
    score: bestScore + 0, // never -0
    depth: completed,
    nodes,
    timeMs: now() - start,
    selDepth,
  }
}
