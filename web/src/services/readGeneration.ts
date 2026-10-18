/** Retry a read invalidated while it was in flight; publish inside the generation check. */
export const publishCurrentGeneration = async <T>(read: () => Promise<T>, generation: () => number,
  current: () => boolean, publish: (value: T) => void): Promise<void> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const version = generation();
    const value = await read();
    if (!current()) return;
    if (version === generation()) { publish(value); return; }
  }
  throw Object.assign(new Error('Related history changed repeatedly while refreshing'), { code: 'stale-read' });
};
