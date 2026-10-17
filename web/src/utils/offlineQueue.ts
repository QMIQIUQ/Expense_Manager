export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'expense' | 'category' | 'budget' | 'recurring' | 'scheduledPayment' | 'scheduledPaymentRecord' | 'income' | 'card' | 'bank' | 'ewallet' | 'repayment' | 'transfer' | 'featureSettings' | 'quickExpensePreset' | 'userSettings' | 'dashboardLayout';
  payload: unknown;
  timestamp: number;
  retryCount: number;
  status?: 'needs-attention';
}

const QUEUE_KEY = 'offline_operations_queue';
const MAX_RETRY = 3;

export const offlineQueue = {
  // Add operation to queue
  enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): string | null {
    const queue = this.getAll();
    const id = `op-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const queuedOp: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };
    queue.push(queuedOp);
    return this.save(queue) ? id : null;
  },

  enqueueMany(operations: Array<Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>>): string[] | null {
    if (operations.length === 0) return [];
    const queue = this.getAll();
    const timestamp = Date.now();
    const queuedOperations = operations.map((operation, index): QueuedOperation => ({
      ...operation,
      id: `op-${timestamp}-${index}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp,
      retryCount: 0,
    }));
    return this.save([...queue, ...queuedOperations]) ? queuedOperations.map((operation) => operation.id) : null;
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

  hasPendingBudgetOperations(budgetId: string, userId: string): boolean {
    return this.getAll().some((operation) => {
      if (operation.entity !== 'budget') return false;
      const payload = operation.payload as { id?: unknown; userId?: unknown };
      return payload?.id === budgetId && payload?.userId === userId;
    });
  },

  hasPendingExpenseOperations(expenseId: string, userId: string): boolean {
    return this.getAll().some((operation) => {
      if (operation.entity !== 'expense') return false;
      const payload = operation.payload as { id?: unknown; userId?: unknown };
      return payload?.id === expenseId && payload?.userId === userId;
    });
  },

  hasPendingExpenseDelete(expenseId: string, userId: string): boolean {
    return this.getAll().some((operation) => {
      if (operation.entity !== 'expense' || operation.type !== 'delete') return false;
      const payload = operation.payload as { id?: unknown; userId?: unknown };
      return payload?.id === expenseId && payload?.userId === userId;
    });
  },

  updatePayload(id: string, payload: unknown): boolean {
    const queue = this.getAll();
    const operation = queue.find((item) => item.id === id);
    if (!operation) return false;
    operation.payload = payload;
    return this.save(queue);
  },

  retry(id: string): boolean {
    const queue = this.getAll();
    const operation = queue.find((item) => item.id === id);
    if (!operation) return false;
    operation.retryCount = 0;
    delete operation.status;
    return this.save(queue);
  },

  retryExpenseOperationsForId(expenseId: string, userId: string): boolean {
    const queue = this.getAll();
    let found = false;
    for (const operation of queue) {
      if (operation.entity !== 'expense') continue;
      const payload = operation.payload as { id?: unknown; userId?: unknown };
      if (payload?.id !== expenseId || payload?.userId !== userId) continue;
      operation.retryCount = 0;
      delete operation.status;
      found = true;
    }
    return found && this.save(queue);
  },

  removeBudgetOperationsForId(budgetId: string, userId: string): void {
    const queue = this.getAll().filter((operation) => {
      if (operation.entity !== 'budget') return true;
      const payload = operation.payload as { id?: unknown; userId?: unknown };
      return payload?.id !== budgetId || payload?.userId !== userId;
    });
    this.save(queue);
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

    // Keep exhausted operations visible and retryable. Removing an operation
    // here would leave its optimistic UI state with no way to reconcile it.
    if (operation.retryCount >= MAX_RETRY) {
      operation.status = 'needs-attention';
      this.save(queue);
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
  save(queue: QueuedOperation[]): boolean {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      return true;
    } catch (error) {
      console.error('Error saving offline queue:', error);
      return false;
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
