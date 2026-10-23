import { getQueuedWriteId, writeLocalFirst, writeLocalFirstBatch, type LocalMutation } from '../utils/localFirstMutation';

/** Resolve only after the existing outbox has durably accepted the intent. */
export const acceptLocalMutation = async (mutation: LocalMutation): Promise<void> => {
  try { await writeLocalFirst(mutation, async () => undefined); }
  catch (error) { if (!getQueuedWriteId(error)) throw error; }
};
export const acceptLocalMutationBatch = async (mutations: LocalMutation[]): Promise<void> => {
  try { await writeLocalFirstBatch(mutations, async () => undefined); }
  catch (error) { if (!getQueuedWriteId(error)) throw error; }
};
