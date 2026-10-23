import { collection, doc, getDocsFromServer, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { dataService } from './dataService';
import { acceptLocalMutation } from './acceptLocalMutation';
import type { ExpenseTag } from '../types';

export const normalizeTagName = (name: string): string => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export const expenseTagService = {
  list(userId: string, onUpdate?: (rows: ExpenseTag[]) => void): Promise<ExpenseTag[]> {
    return dataService.getDataWithRevalidate('expenseTags', userId, async () => {
      const result = await getDocsFromServer(query(collection(db, 'expenseTags'), where('userId', '==', userId)));
      return result.docs.map((row) => ({ ...row.data(), id: row.id } as ExpenseTag));
    }, onUpdate);
  },
  async save(userId: string, name: string, color: string, existing?: ExpenseTag): Promise<void> {
    const displayName = name.normalize('NFKC').trim().replace(/\s+/g, ' ');
    const normalizedName = normalizeTagName(displayName);
    if (!normalizedName || normalizedName.includes('/') || normalizedName.length > 40 || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Invalid tag (1–40 characters, no /)');
    const rows = await this.list(userId);
    if (rows.some((row) => row.id !== existing?.id && !row.archived && row.normalizedName === normalizedName)) throw new Error('Tag name already exists');
    const id = existing?.id ?? doc(collection(db, 'expenseTags')).id;
    await acceptLocalMutation({ entity: 'expenseTag', type: existing ? 'update' : 'create', payload: {
      id, userId, name: displayName, normalizedName, color, archived: existing?.archived ?? false,
    } });
  },
  async archive(userId: string, tag: ExpenseTag, archived: boolean): Promise<void> {
    await acceptLocalMutation({ entity: 'expenseTag', type: 'update', payload: { id: tag.id, userId, archived } });
  },
};
