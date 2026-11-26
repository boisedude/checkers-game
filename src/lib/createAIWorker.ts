/**
 * Worker construction lives alone here because it uses import.meta, which Jest
 * cannot compile. Jest maps this module to a stub (see jest.config.ts).
 */
export function createAIWorker(): Worker {
  return new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' })
}
