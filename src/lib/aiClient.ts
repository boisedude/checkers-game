/**
 * AI client: asks a web worker for the opponent's move (or a hint) so the search
 * never blocks the main thread. Falls back to a synchronous call, with a much
 * smaller time budget, when workers are unavailable or fail.
 */

import { getAIMove, SYNC_TIME_MS } from '@/lib/aiStrategies'
import { createAIWorker } from '@/lib/createAIWorker'

type AIArgs = Parameters<typeof getAIMove>
type AIMove = ReturnType<typeof getAIMove>

interface Pending {
  args: AIArgs
  resolve: (move: AIMove) => void
  reject: (error: unknown) => void
}

let worker: Worker | null = null
let workerBroken = false
let nextId = 1
const pending = new Map<number, Pending>()

function runSync({ args, resolve, reject }: Pending) {
  try {
    const [board, player, difficulty, context = {}] = args
    const timeMs = Math.min(context.timeMs ?? SYNC_TIME_MS, SYNC_TIME_MS)
    resolve(getAIMove(board, player, difficulty, { ...context, timeMs }))
  } catch (error) {
    reject(error)
  }
}

/** Worker died: answer everything in flight synchronously and stop using it. */
function abandonWorker() {
  workerBroken = true
  worker?.terminate()
  worker = null
  const waiting = [...pending.values()]
  pending.clear()
  waiting.forEach(runSync)
}

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === 'undefined') return null
  if (worker) return worker
  try {
    const created = createAIWorker()
    created.onmessage = (event: MessageEvent<{ id: number; move?: AIMove; error?: string }>) => {
      const entry = pending.get(event.data.id)
      if (!entry) return
      pending.delete(event.data.id)
      if (event.data.error === undefined) entry.resolve(event.data.move ?? null)
      else entry.reject(new Error(event.data.error))
    }
    created.onerror = abandonWorker
    created.onmessageerror = abandonWorker
    worker = created
    return worker
  } catch {
    workerBroken = true
    return null
  }
}

export function requestAIMove(...args: AIArgs): Promise<AIMove> {
  return new Promise<AIMove>((resolve, reject) => {
    const entry: Pending = { args, resolve, reject }
    const w = getWorker()
    if (!w) return runSync(entry)
    const id = nextId++
    pending.set(id, entry)
    try {
      w.postMessage({ id, args })
    } catch {
      pending.delete(id)
      runSync(entry)
    }
  })
}
