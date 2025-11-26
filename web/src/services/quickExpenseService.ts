// Quick Expense Service - 快速支出预设服务
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { QuickExpensePreset, QuickExpensePresetInput } from '../types/quickExpense';

const COLLECTION_NAME = 'quickExpensePresets';

// 获取用户的所有快速支出预设
export const getQuickExpensePresets = async (userId: string): Promise<QuickExpensePreset[]> => {
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
};

// 创建快速支出预设
export const createQuickExpensePreset = async (
  userId: string,
  input: QuickExpensePresetInput
): Promise<QuickExpensePreset> => {
  // 获取当前最大 order
  const existing = await getQuickExpensePresets(userId);
  const maxOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.order)) : -1;

  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    userId,
    ...input,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    userId,
    ...input,
    order: maxOrder + 1,
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
  getPresets: getQuickExpensePresets,
  create: createQuickExpensePreset,
  update: updateQuickExpensePreset,
  delete: deleteQuickExpensePreset,
  updateOrder: updateQuickExpenseOrder,
};
