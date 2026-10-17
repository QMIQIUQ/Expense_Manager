import { useState, useCallback, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { QueuedOperation } from '../utils/offlineQueue';
import { getQueuedWriteId, writeLocalFirst } from '../utils/localFirstMutation';

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
  entityType?: QueuedOperation['entity'];
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
        const result = options?.retryToQueueOnFail && options.entityType
          ? await writeLocalFirst({ type: operation.type, entity: options.entityType, payload: operation.data }, apiCall)
          : await apiCall();

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
          try { void Promise.resolve(options.onSuccess(result)).catch((error) => console.error('Post-save refresh failed:', error)); }
          catch (error) { console.error('Post-save refresh failed:', error); }
        }

        return result;
      } catch (error) {
        const operationQueued = getQueuedWriteId(error) !== null;
        if (!operationQueued) console.error('Operation failed:', error);

        // Remove from pending
        setPendingOperations((prev) => {
          const newMap = new Map(prev);
          newMap.delete(operationId);
          return newMap;
        });

        if (operationQueued) {
          options?.onQueued?.();
          if (notificationId) updateNotification(notificationId, {
            type: 'info', message: t('operationSavedOffline'), duration: 5000,
          });
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
            ],
          });
        }

        // Call error callback
        if (options?.onError && !operationQueued) {
          options.onError(error);
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
