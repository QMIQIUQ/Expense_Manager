interface CachedReceipt { key: string; userId: string; attachmentId: string; sha256: string; blob: Blob }
let connection: Promise<IDBDatabase> | undefined;
const open = () => {
  if (connection) return connection;
  connection = new Promise<IDBDatabase>((resolve, reject) => {
    let rejected = false;
    const request = indexedDB.open('expense-receipt-archive', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('contents', { keyPath: 'key' });
    request.onerror = () => reject(request.error);
    request.onblocked = () => { rejected = true; reject(new Error('Close older tabs before opening receipt storage')); };
    request.onsuccess = () => { const db = request.result; if (rejected) { db.close(); return; } db.onversionchange = () => { db.close(); connection = undefined; }; resolve(db); };
  });
  connection.catch(() => { connection = undefined; }); return connection;
};
export const cacheReceiptContent = async (userId: string, attachmentId: string, sha256: string, blob: Blob): Promise<void> => {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('contents', 'readwrite');
    transaction.objectStore('contents').put({ key: `${userId}:${attachmentId}`, userId, attachmentId, sha256, blob } satisfies CachedReceipt);
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
  });
};
export const readCachedReceiptContent = async (userId: string, attachmentId: string, sha256: string): Promise<Blob | undefined> => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('contents', 'readonly'); const request = transaction.objectStore('contents').get(`${userId}:${attachmentId}`);
    transaction.oncomplete = () => { const row = request.result as CachedReceipt | undefined; resolve(row?.userId === userId && row.attachmentId === attachmentId && row.sha256 === sha256 ? row.blob : undefined); };
    transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
  });
};
