/** Jest stand-in for createAIWorker: no worker, so aiClient searches synchronously. */
export function createAIWorker(): Worker {
  throw new Error('No workers under Jest')
}
