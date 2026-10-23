import { getQueuedWriteId, writeLocalFirst, type LocalMutation } from '../utils/localFirstMutation';

/** Resolve only after the existing outbox has durably accepted the intent. */
export const acceptLocalMutation = async (mutation: LocalMutation): Promise<void> => {
  try { await writeLocalFirst(mutation, async () => undefined); }
  catch (error) { if (!getQueuedWriteId(error)) throw error; }
};
