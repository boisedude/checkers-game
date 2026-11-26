/** Worker construction lives alone here so tests can run without it (jsdom has no Worker). */
export function createAIWorker(): Worker {
  return new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' })
}
