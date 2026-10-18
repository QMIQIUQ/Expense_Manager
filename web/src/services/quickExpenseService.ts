// Quick Expense Service - 快速支出预设服务
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { QuickExpensePreset, QuickExpensePresetInput } from '../types/quickExpense';
import { dataService } from './dataService';

const COLLECTION_NAME = 'quickExpensePresets';

// 获取用户的所有快速支出预设
export const getQuickExpensePresets = async (userId: string, onUpdate?: (presets: QuickExpensePreset[]) => void): Promise<QuickExpensePreset[]> =>
 dataService.getDataWithRevalidate('quickExpensePresets', userId, async () => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('order', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as QuickExpensePreset[];
}, onUpdate);

// 创建快速支出预设
export const createQuickExpensePreset = async (
  userId: string,
  input: QuickExpensePresetInput & { id?: string; order?: number }
): Promise<QuickExpensePreset> => {
  const { id, order, ...fields } = input;
  const suppliedOrder = Number.isFinite(order) ? order : undefined;
  const existing = suppliedOrder === undefined ? await getQuickExpensePresets(userId) : [];
  const nextOrder = suppliedOrder ?? (existing.length > 0 ? Math.max(...existing.map((p) => p.order)) + 1 : 0);

  const now = Timestamp.now();
  const presetRef = id ? doc(db, COLLECTION_NAME, id) : doc(collection(db, COLLECTION_NAME));
  await setDoc(presetRef, {
    userId,
    ...fields,
    order: nextOrder,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: presetRef.id,
    userId,
    ...fields,
    order: nextOrder,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  } as QuickExpensePreset;
};

// 更新快速支出预设
export const updateQuickExpensePreset = async (
  presetId: string,
  updates: Partial<QuickExpensePresetInput>
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, presetId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

// 删除快速支出预设
export const deleteQuickExpensePreset = async (presetId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, presetId);
  await deleteDoc(docRef);
};

// 更新排序
export const updateQuickExpenseOrder = async (
  _userId: string,
  orderedIds: string[]
): Promise<void> => {
  const promises = orderedIds.map((id, index) =>
    updateDoc(doc(db, COLLECTION_NAME, id), {
      order: index,
      updatedAt: Timestamp.now(),
    })
  );
  await Promise.all(promises);
};

export const quickExpenseService = {
  createId: () => doc(collection(db, COLLECTION_NAME)).id,
  getPresets: getQuickExpensePresets,
  create: createQuickExpensePreset,
  update: updateQuickExpensePreset,
  delete: deleteQuickExpensePreset,
  updateOrder: updateQuickExpenseOrder,
};
