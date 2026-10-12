import { useState, useCallback, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
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
  onQueued?: () => void;
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
  const { t } = useLanguage();
  const operationCounter = useRef(0);

  // Get translated messages - wrapped in useCallback to ensure stable references
  const getSuccessMessage = useCallback((type: 'create' | 'update' | 'delete'): string => {
    switch (type) {
      case 'create':
        return t('successfullyCreated');
      case 'update':
        return t('successfullyUpdated');
      case 'delete':
        return t('successfullyDeleted');
      default:
        return t('operationCompleted');
    }
  }, [t]);

  const getErrorMessage = useCallback((type: 'create' | 'update' | 'delete', error: unknown): string => {
    const action = type === 'create' ? t('create') : type === 'update' ? t('update') : t('delete');
    const errorMsg = error instanceof Error ? error.message : t('unknownError');
    
    // Check for Firebase permission errors
    if (errorMsg.includes('Missing or insufficient permissions') || errorMsg.includes('permission-denied')) {
      return `${t('failedTo')} ${action}: ${t('configureFirebaseRules')}`;
    }
    
    return `${t('failedTo')} ${action}: ${errorMsg}`;
  }, [t]);

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
        notificationId = showNotification('pending', t('processing'), {
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
        let errorForCallback = error;
        let operationQueued = false;

        if (isNetworkError && options?.retryToQueueOnFail && options?.entityType) {
          // Queue the operation for later retry
          const queuedId = offlineQueue.enqueue({
            type: operation.type,
            entity: options.entityType,
            payload: operation.data,
          });

          if (queuedId) {
            operationQueued = true;
            options.onQueued?.();
            if (notificationId) {
              updateNotification(notificationId, {
                type: 'info',
                message: t('operationSavedOffline'),
                duration: 5000,
              });
            }
          } else {
            errorForCallback = new Error(t('offlineQueueSaveFailed'));
            if (notificationId) hideNotification(notificationId);
            showNotification('error', t('offlineQueueSaveFailed'), { duration: 0 });
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
                label: t('retry'),
                onClick: () => run(operation, apiCall, options),
              },
              ...(options?.entityType
                ? [
                    {
                      label: t('saveOffline'),
                      onClick: () => {
                        const queuedId = offlineQueue.enqueue({
                          type: operation.type,
                          entity: options.entityType!,
                          payload: operation.data,
                        });
                        showNotification(
                          queuedId ? 'info' : 'error',
                          queuedId ? t('operationSavedOffline') : t('offlineQueueSaveFailed'),
                          { duration: queuedId ? 5000 : 0 }
                        );
                      },
                    },
                  ]
                : []),
            ],
          });
        }

        // Call error callback
        if (options?.onError && !operationQueued) {
          options.onError(errorForCallback);
        }

        return null;
      }
    },
    [showNotification, hideNotification, updateNotification, t, getSuccessMessage, getErrorMessage]
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

// Helper function for checking offline errors
function isOfflineError(error: unknown): boolean {
  const errorCode = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code).toLowerCase().split('/').pop()
    : undefined;
  if (errorCode === 'permission-denied' || errorCode === 'invalid-argument' || errorCode === 'failed-precondition') {
    return false;
  }
  if (errorCode === 'unavailable' || errorCode === 'deadline-exceeded' || errorCode === 'network-request-failed') {
    return true;
  }

  if (error instanceof Error) {
    if (/invalid-allocation|invalid-limit|limit-below-allocation|budget-(?:owner-mismatch|id-conflict|not-found|owner-missing)|user-settings-not-found/i.test(error.message)) {
      return false;
    }
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
