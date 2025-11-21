import { useState, useCallback, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { offlineQueue } from '../utils/offlineQueue';

export interface OptimisticOperation<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: T;
  originalData?: T;
}

interface UseOptimisticCRUDOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
  retryToQueueOnFail?: boolean;
  entityType?: 'expense' | 'category' | 'budget' | 'recurring' | 'income' | 'card' | 'bank' | 'ewallet' | 'repayment';
  suppressNotification?: boolean;
  successMessage?: string;
}

export const useOptimisticCRUD = <T,>() => {
  const [pendingOperations, setPendingOperations] = useState<Map<string, OptimisticOperation<T>>>(
    new Map()
  );
  const { showNotification, hideNotification, updateNotification } = useNotification();
  const operationCounter = useRef(0);

  const run = useCallback(
    async <R = unknown,>(
      operation: Omit<OptimisticOperation<T>, 'id'>,
      apiCall: () => Promise<R>,
      options?: UseOptimisticCRUDOptions
    ): Promise<R | null> => {
      const operationId = `op-${Date.now()}-${++operationCounter.current}`;

      // Add to pending operations
      const fullOperation: OptimisticOperation<T> = {
        ...operation,
        id: operationId,
      };
      setPendingOperations((prev) => new Map(prev).set(operationId, fullOperation));

      // Show pending notification unless suppressed (bulk operations may want one notification)
      let notificationId: string | undefined;
      if (!options?.suppressNotification) {
        notificationId = showNotification('pending', 'Processing...', {
          duration: 0, // Persistent
        });
      }

      try {
        // Execute API call
        const result = await apiCall();

        // Success: remove pending operation
        setPendingOperations((prev) => {
          const newMap = new Map(prev);
          newMap.delete(operationId);
          return newMap;
        });

        // Update notification to success (only if a notification was created)
        if (notificationId) {
          updateNotification(notificationId, {
            type: 'success',
            message: options?.successMessage || getSuccessMessage(operation.type),
            duration: 3000,
          });
        }

        // Call success callback
        if (options?.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (error) {
        console.error('Operation failed:', error);

        // Remove from pending
        setPendingOperations((prev) => {
          const newMap = new Map(prev);
          newMap.delete(operationId);
          return newMap;
        });

        // Check if it's a network error
        const isNetworkError = isOfflineError(error);

        if (isNetworkError && options?.retryToQueueOnFail && options?.entityType) {
          // Queue the operation for later retry
          offlineQueue.enqueue({
            type: operation.type,
            entity: options.entityType,
            payload: operation.data,
          });

          // Update notification
          if (notificationId) {
            updateNotification(notificationId, {
              type: 'info',
              message: 'Operation saved offline. Will retry when connection is restored.',
              duration: 5000,
            });
          }
        } else {
          // Show error notification with retry option
          if (notificationId) {
            hideNotification(notificationId);
          }
          showNotification('error', getErrorMessage(operation.type, error), {
            duration: 0,
            actions: [
              {
                label: 'Retry',
                onClick: () => run(operation, apiCall, options),
              },
              ...(options?.entityType
                ? [
                    {
                      label: 'Save Offline',
                      onClick: () => {
                        offlineQueue.enqueue({
                          type: operation.type,
                          entity: options.entityType!,
                          payload: operation.data,
                        });
                        showNotification(
                          'info',
                          'Operation saved offline. Will retry when connection is restored.',
                          { duration: 5000 }
                        );
                      },
                    },
                  ]
                : []),
            ],
          });
        }

        // Call error callback
        if (options?.onError) {
          options.onError(error);
        }

        return null;
      }
    },
    [showNotification, hideNotification, updateNotification]
  );

  const hasId = (data: unknown): data is { id: string } => {
    return typeof data === 'object' && data !== null && 'id' in data;
  };

  const isPending = useCallback(
    (itemId: string) => {
      return Array.from(pendingOperations.values()).some((op) => {
        return hasId(op.data) && op.data.id === itemId;
      });
    },
    [pendingOperations]
  );

  const getPendingOperation = useCallback(
    (itemId: string) => {
      return Array.from(pendingOperations.values()).find((op) => {
        return hasId(op.data) && op.data.id === itemId;
      });
    },
    [pendingOperations]
  );

  return {
    run,
    isPending,
    getPendingOperation,
    pendingCount: pendingOperations.size,
  };
};

// Helper functions
function getSuccessMessage(type: 'create' | 'update' | 'delete'): string {
  switch (type) {
    case 'create':
      return 'Successfully created!';
    case 'update':
      return 'Successfully updated!';
    case 'delete':
      return 'Successfully deleted!';
    default:
      return 'Operation completed!';
  }
}

function getErrorMessage(type: 'create' | 'update' | 'delete', error: unknown): string {
  const action = type === 'create' ? 'create' : type === 'update' ? 'update' : 'delete';
  const errorMsg = error instanceof Error ? error.message : 'Unknown error';
  
  // Check for Firebase permission errors
  if (errorMsg.includes('Missing or insufficient permissions') || errorMsg.includes('permission-denied')) {
    return `Failed to ${action}: Please configure Firebase security rules for the cards collection. See PR description for instructions.`;
  }
  
  return `Failed to ${action}: ${errorMsg}`;
}

function isOfflineError(error: unknown): boolean {
  if (error instanceof Error) {
    // Don't treat permission errors as offline errors
    if (error.message.includes('Missing or insufficient permissions') || error.message.includes('permission-denied')) {
      return false;
    }
    return (
      error.message.includes('network') ||
      error.message.includes('offline') ||
      error.message.includes('Failed to fetch') ||
      !navigator.onLine
    );
  }
  return !navigator.onLine;
}
