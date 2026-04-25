const DB_NAME = 'expense-receipt-drafts';
const DB_VERSION = 1;
const IMAGE_STORE = 'receiptImages';
const META_PREFIX = 'expense_receipt_draft_meta_';
const USER_INDEX_PREFIX = 'expense_receipt_draft_user_index_';
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type ReceiptPaymentMethod = 'cash' | 'credit_card' | 'e_wallet' | 'bank';

export interface ReceiptDraftFormState {
  date: string;
  time: string;
  amount: number;
  category: string;
  description: string;
  notes: string;
  paymentMethod: ReceiptPaymentMethod;
  paymentMethodName: string;
  cardId: string;
  bankId: string;
  needsRepaymentTracking: boolean;
}

export interface ReceiptDraftSnapshot {
  draftId: string;
  userId: string;
  updatedAt: number;
  expiresAt: number;
  currentStep: number;
  formData: ReceiptDraftFormState;
  amountItems: Array<{ amount: number; description?: string }>;
  currentAmountInput: number;
  enableTax: boolean;
  taxRate: number;
  enableTransfer: boolean;
  transferToPaymentMethod: ReceiptPaymentMethod;
  transferToCardId: string;
  transferToEWalletName: string;
  transferToBankId: string;
  receiptText: string;
  receiptMerchant?: string;
  receiptDate?: string;
  receiptAmount?: number;
  imageName?: string;
  imageType?: string;
  imageSize?: number;
}

export interface LoadedReceiptDraft {
  draft: ReceiptDraftSnapshot;
  imageBlob: Blob | null;
}

interface StoredBlobRecord {
  draftId: string;
  blob: Blob;
  updatedAt: number;
}

const safeJsonParse = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const makeDraftId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getUserIndexKey = (userId: string) => `${USER_INDEX_PREFIX}${userId}`;
const getMetaKey = (draftId: string) => `${META_PREFIX}${draftId}`;

const readUserIndex = (userId: string): string[] => {
  try {
    const raw = localStorage.getItem(getUserIndexKey(userId));
    const parsed = safeJsonParse<string[]>(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const writeUserIndex = (userId: string, draftIds: string[]): void => {
  try {
    const unique = Array.from(new Set(draftIds.filter(Boolean)));
    localStorage.setItem(getUserIndexKey(userId), JSON.stringify(unique));
  } catch {
    // Ignore quota issues for the index
  }
};

const readMeta = (draftId: string): ReceiptDraftSnapshot | null => {
  try {
    const raw = localStorage.getItem(getMetaKey(draftId));
    return safeJsonParse<ReceiptDraftSnapshot>(raw);
  } catch {
    return null;
  }
};

const writeMeta = (draft: ReceiptDraftSnapshot): void => {
  try {
    localStorage.setItem(getMetaKey(draft.draftId), JSON.stringify(draft));
  } catch {
    // Ignore quota issues for metadata; the UI will continue without persistence.
  }
};

const removeMeta = (draftId: string): void => {
  try {
    localStorage.removeItem(getMetaKey(draftId));
  } catch {
    // ignore
  }
};

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: 'draftId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open receipt draft database'));
  });
};

const putBlobRecord = async (draftId: string, blob: Blob): Promise<void> => {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, 'readwrite');
      const store = tx.objectStore(IMAGE_STORE);
      const record: StoredBlobRecord = { draftId, blob, updatedAt: Date.now() };
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to store receipt image'));
    });
  } finally {
    db.close();
  }
};

const getBlobRecord = async (draftId: string): Promise<StoredBlobRecord | null> => {
  const db = await openDb();
  try {
    return await new Promise<StoredBlobRecord | null>((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, 'readonly');
      const store = tx.objectStore(IMAGE_STORE);
      const request = store.get(draftId);
      request.onsuccess = () => resolve((request.result as StoredBlobRecord) || null);
      request.onerror = () => reject(request.error || new Error('Failed to load receipt image'));
    });
  } finally {
    db.close();
  }
};

const deleteBlobRecord = async (draftId: string): Promise<void> => {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, 'readwrite');
      const store = tx.objectStore(IMAGE_STORE);
      const request = store.delete(draftId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to delete receipt image'));
    });
  } finally {
    db.close();
  }
};

export const createReceiptDraftId = makeDraftId;

export const loadReceiptDraft = async (draftId: string): Promise<LoadedReceiptDraft | null> => {
  const draft = readMeta(draftId);
  if (!draft) return null;

  let imageBlob: Blob | null = null;
  try {
    const record = await getBlobRecord(draftId);
    imageBlob = record?.blob || null;
  } catch {
    imageBlob = null;
  }

  return { draft, imageBlob };
};

export const loadLatestReceiptDraft = async (userId: string): Promise<LoadedReceiptDraft | null> => {
  const cleanedIds: string[] = [];
  const candidates: ReceiptDraftSnapshot[] = [];

  for (const draftId of readUserIndex(userId)) {
    const draft = readMeta(draftId);
    if (!draft) {
      continue;
    }

    if (draft.userId !== userId) {
      continue;
    }

    if (draft.expiresAt <= Date.now()) {
      await deleteReceiptDraft(draftId);
      continue;
    }

    cleanedIds.push(draftId);
    candidates.push(draft);
  }

  writeUserIndex(userId, cleanedIds);

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.updatedAt - a.updatedAt);
  const latest = candidates[0];
  return loadReceiptDraft(latest.draftId);
};

export const saveReceiptDraft = async (
  draft: ReceiptDraftSnapshot,
  imageBlob?: Blob | null,
): Promise<void> => {
  const nextDraft: ReceiptDraftSnapshot = {
    ...draft,
    updatedAt: Date.now(),
    expiresAt: draft.expiresAt || (Date.now() + DEFAULT_TTL_MS),
  };

  writeMeta(nextDraft);

  if (imageBlob) {
    await putBlobRecord(nextDraft.draftId, imageBlob);
  }

  const userIndex = readUserIndex(nextDraft.userId);
  if (!userIndex.includes(nextDraft.draftId)) {
    userIndex.push(nextDraft.draftId);
    writeUserIndex(nextDraft.userId, userIndex);
  }
};

export const deleteReceiptDraft = async (draftId: string, userId?: string): Promise<void> => {
  const draft = readMeta(draftId);
  const actualUserId = userId || draft?.userId;

  removeMeta(draftId);
  try {
    await deleteBlobRecord(draftId);
  } catch {
    // ignore
  }

  if (actualUserId) {
    const userIndex = readUserIndex(actualUserId).filter((id) => id !== draftId);
    writeUserIndex(actualUserId, userIndex);
  } else {
    // Best-effort cleanup if the user is unknown.
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(USER_INDEX_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      const parsed = safeJsonParse<string[]>(raw);
      if (!Array.isArray(parsed)) continue;
      const filtered = parsed.filter((id) => id !== draftId);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  }
};

export const cleanupReceiptDrafts = async (userId?: string): Promise<number> => {
  const indexKeys = userId ? [getUserIndexKey(userId)] : Object.keys(localStorage).filter((key) => key.startsWith(USER_INDEX_PREFIX));
  let removed = 0;

  for (const indexKey of indexKeys) {
    const rawUserId = indexKey.replace(USER_INDEX_PREFIX, '');
    const draftIds = readUserIndex(rawUserId);
    const keptIds: string[] = [];

    for (const draftId of draftIds) {
      const draft = readMeta(draftId);
      if (!draft || draft.expiresAt <= Date.now()) {
        await deleteReceiptDraft(draftId, rawUserId);
        removed += 1;
        continue;
      }
      keptIds.push(draftId);
    }

    writeUserIndex(rawUserId, keptIds);
  }

  return removed;
};

export const buildReceiptDraftImageName = (fileName?: string): string | undefined => {
  if (!fileName) return undefined;
  return fileName.replace(/\.[^.]+$/, '.jpg');
};
