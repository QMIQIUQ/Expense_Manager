let mutationQueue: Promise<void> = Promise.resolve();

export async function withBudgetMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = mutationQueue.catch(() => undefined);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  mutationQueue = previous.then(() => pending);
  await previous;

  try {
    return await operation();
  } finally {
    release();
  }
}
