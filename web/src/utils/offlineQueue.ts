export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'expense' | 'category' | 'budget' | 'recurring' | 'income' | 'card' | 'bank' | 'ewallet' | 'repayment';
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'offline_operations_queue';
const MAX_RETRY = 3;

export const offlineQueue = {
  // Add operation to queue
  enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const queue = this.getAll();
    const id = `op-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const queuedOp: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };
    queue.push(queuedOp);
    this.save(queue);
    return id;
  },

  // Get all queued operations
  getAll(): QueuedOperation[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading offline queue:', error);
      return [];
    }
  },

  // Remove operation from queue
  dequeue(id: string): void {
    const queue = this.getAll().filter((op) => op.id !== id);
    this.save(queue);
  },

  // Update retry count
  incrementRetry(id: string): boolean {
    const queue = this.getAll();
    const operation = queue.find((op) => op.id === id);
    if (!operation) return false;

    operation.retryCount += 1;

    // If max retries exceeded, remove from queue
    if (operation.retryCount >= MAX_RETRY) {
      this.dequeue(id);
      return false;
    }

    this.save(queue);
    return true;
  },

  // Clear entire queue
  clear(): void {
    localStorage.removeItem(QUEUE_KEY);
  },

  // Get count of queued operations
  count(): number {
    return this.getAll().length;
  },

  // Save queue to localStorage
  save(queue: QueuedOperation[]): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  },

  // Process queue (attempt to execute all operations)
  async processQueue(
    executor: (operation: QueuedOperation) => Promise<boolean>
  ): Promise<{ success: number; failed: number }> {
    const queue = this.getAll();
    let success = 0;
    let failed = 0;

    for (const operation of queue) {
      try {
        const result = await executor(operation);
        if (result) {
          this.dequeue(operation.id);
          success++;
        } else {
          const canRetry = this.incrementRetry(operation.id);
          if (!canRetry) {
            failed++;
          }
        }
      } catch (error) {
        console.error('Error processing queued operation:', error);
        const canRetry = this.incrementRetry(operation.id);
        if (!canRetry) {
          failed++;
        }
      }
    }

    return { success, failed };
  },
};
