import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Expense, Income, Repayment, Budget, Card, Category, EWallet, Bank, ScheduledPayment, ScheduledPaymentRecord } from '../../types';
import { DashboardWidget, DEFAULT_DASHBOARD_LAYOUT } from '../../types/dashboard';
import { QuickExpensePreset } from '../../types/quickExpense';
import { dashboardLayoutService } from '../../services/dashboardLayoutService';
import { quickExpenseService } from '../../services/quickExpenseService';
import { queueFailedWrite, writeLocalFirst } from '../../utils/localFirstMutation';
import { sessionCache } from '../../utils/sessionCache';
import { applyPendingOperations } from '../../utils/pendingOperations';

const isRetryableNetworkError = (error: unknown): boolean => {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code).toLowerCase().split('/').pop()
    : '';
  if (['permission-denied', 'invalid-argument', 'failed-precondition'].includes(code || '')) return false;
  return ['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code || '') ||
    (typeof navigator !== 'undefined' && !navigator.onLine);
};
import WidgetContainer from './widgets/WidgetContainer';
import type { WidgetProps } from './widgets/types';
import DashboardCustomizer from './DashboardCustomizer';

interface CustomizableDashboardProps {
  completeness?: import('./widgets/completeness').WidgetCompleteness;
  expenses: Expense[];
  incomes: Income[];
  repayments: Repayment[];
  budgets: Budget[];
  cards: Card[];
  categories: Category[];
  ewallets: EWallet[];
  banks: Bank[];
  billingCycleDay: number;
  displayCurrency?: import('../../types').CurrencyCode;
  onMarkTrackingCompleted?: (expenseId: string) => void;
  onQuickAdd?: () => void;
  onQuickExpenseAdd?: (preset: QuickExpensePreset) => Promise<void>;
  onQuickExpensePresetsChange?: () => void;
  onNavigateToExpenses?: () => void;
  onNavigateToExpenseCategory?: (category: string, startDate: string, endDate: string) => void;
  onNavigateToExpenseMonth?: (month: string) => void;
  onNavigateToExpense?: (expenseId: string) => void;
  onNavigateToScheduledPayment?: (scheduledPaymentId: string) => void;
  onNavigateToIncomes?: () => void;
  onNavigateToBudgets?: () => void;
  onNavigateToPaymentMethods?: () => void;
  onCustomizingChange?: (isCustomizing: boolean) => void;
  // Scheduled payments related
  scheduledPayments?: ScheduledPayment[];
  scheduledPaymentRecords?: ScheduledPaymentRecord[];
  onConfirmScheduledPayment?: (
    scheduledPaymentId: string,
    recordData: Omit<ScheduledPaymentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'scheduledPaymentId'>
  ) => void;
}

const CustomizableDashboard: React.FC<CustomizableDashboardProps> = ({
  completeness,
  expenses,
  incomes,
  repayments,
  budgets,
  cards,
  categories,
  ewallets,
  banks,
  billingCycleDay,
  displayCurrency,
  onMarkTrackingCompleted,
  onQuickAdd,
  onQuickExpenseAdd,
  onQuickExpensePresetsChange,
  onNavigateToExpenses,
  onNavigateToExpenseCategory,
  onNavigateToExpenseMonth,
  onNavigateToExpense,
  onNavigateToScheduledPayment,
  onNavigateToIncomes,
  onNavigateToBudgets,
  onNavigateToPaymentMethods,
  onCustomizingChange,
  scheduledPayments = [],
  scheduledPaymentRecords = [],
  onConfirmScheduledPayment,
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_DASHBOARD_LAYOUT);
  const [isCustomizing, setIsCustomizingState] = useState(false);

  // Wrapper to notify parent when customizing state changes
  const setIsCustomizing = useCallback((value: boolean) => {
    setIsCustomizingState(value);
    onCustomizingChange?.(value);
  }, [onCustomizingChange]);
  const [quickExpensePresets, setQuickExpensePresets] = useState<QuickExpensePreset[]>([]);

  // Load user's dashboard layout asynchronously (non-blocking) to avoid UI spinner and improve perceived performance
  useEffect(() => {
    const loadLayout = async () => {
      if (!currentUser) return;
      
      try {
        const layout = await dashboardLayoutService.getOrCreate(currentUser.uid,
          (fresh) => setWidgets([...fresh.widgets].sort((a, b) => a.order - b.order)));
        setWidgets([...layout.widgets].sort((a, b) => a.order - b.order));
      } catch (error) {
        console.error('Failed to load dashboard layout:', error);
        // Keep using DEFAULT_DASHBOARD_LAYOUT to maintain functionality even if custom layout fails to load
      }
    };

    loadLayout();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const handleLayoutSynced = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; entity?: string }>).detail;
      if (detail?.entity !== 'dashboardLayout' || detail.userId !== currentUser.uid) return;
      void dashboardLayoutService.getOrCreate(currentUser.uid)
        .then((layout) => setWidgets([...layout.widgets].sort((a, b) => a.order - b.order)))
        .catch((error) => console.error('Failed to refresh synced dashboard layout:', error));
    };
    window.addEventListener('offline-operation-synced', handleLayoutSynced);
    return () => window.removeEventListener('offline-operation-synced', handleLayoutSynced);
  }, [currentUser]);

  // Load quick expense presets
  const loadQuickExpensePresets = useCallback(async () => {
    if (!currentUser) return;
    try {
      const presets = await quickExpenseService.getPresets(currentUser.uid, setQuickExpensePresets);
      setQuickExpensePresets(presets);
    } catch (error) {
      console.error('Failed to load quick expense presets:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    loadQuickExpensePresets();
  }, [loadQuickExpensePresets]);

  // Save widget changes (Optimistic Update)
  const handleSaveWidgets = async (newWidgets: DashboardWidget[]) => {
    if (!currentUser) return;
    
    // Store previous state for rollback
    const previousWidgets = [...widgets];
    
    // 1. Optimistic Update: Update UI immediately
    const orderedWidgets = [...newWidgets].sort((a, b) => a.order - b.order);
    setWidgets(orderedWidgets);
    
    try {
      // 2. Save to Firebase in background
      await writeLocalFirst({ type: 'update', entity: 'dashboardLayout', payload: { userId: currentUser.uid, widgets: orderedWidgets } },
        () => dashboardLayoutService.updateWidgets(currentUser.uid, orderedWidgets));
      
      // 3. Notify success
      showNotification('success', t('saveSuccess') || '已保存自定義列表');
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);

      if (isRetryableNetworkError(error)) {
        const queuedId = await queueFailedWrite(error, {
          type: 'update',
          entity: 'dashboardLayout',
          payload: { userId: currentUser.uid, widgets: orderedWidgets },
        });
        if (queuedId) {
          showNotification('info', t('operationSavedOffline'));
          return;
        }
      }
      
      // Restore the last locally accepted layout and keep later queued edits visible.
      const cachedLayout = sessionCache.get<{ userId: string; widgets: DashboardWidget[] }>('dashboardLayout', currentUser.uid);
      const restoredLayout = applyPendingOperations('dashboardLayout', currentUser.uid,
        cachedLayout ?? { userId: currentUser.uid, widgets: previousWidgets });
      setWidgets([...restoredLayout.widgets].sort((a, b) => a.order - b.order));
      
      // 5. Notify error
      showNotification('error', t('saveFailed') || '保存失敗，請稍後重試');
    }
  };

  // Widget data props
  const widgetData: WidgetProps = useMemo(() => ({
    completeness,
    expenses,
    incomes,
    repayments,
    budgets,
    cards,
    categories,
    ewallets,
    banks,
    billingCycleDay,
    displayCurrency,
    onMarkTrackingCompleted,
    onQuickAdd,
    onNavigateToExpense,
    onNavigateToExpenseCategory,
    onNavigateToExpenseMonth,
    onNavigateToScheduledPayment,
    quickExpensePresets,
    onQuickExpenseAdd,
    onQuickExpensePresetsChange: onQuickExpensePresetsChange || loadQuickExpensePresets,
    scheduledPayments,
    scheduledPaymentRecords,
    onConfirmScheduledPayment,
  }), [completeness, expenses, incomes, repayments, budgets, cards, categories, ewallets, banks, billingCycleDay,
    displayCurrency, onMarkTrackingCompleted, onQuickAdd, onNavigateToExpense, onNavigateToExpenseCategory,
    onNavigateToExpenseMonth, onNavigateToScheduledPayment, quickExpensePresets, onQuickExpenseAdd,
    onQuickExpensePresetsChange, loadQuickExpensePresets, scheduledPayments, scheduledPaymentRecords, onConfirmScheduledPayment]);

  // Get enabled widgets sorted by order
  const enabledWidgets = useMemo(() => widgets
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order), [widgets]);

  return (
    <div className="customizable-dashboard">
      {/* Header with customize button */}
      <div className="dashboard-customize-header">
        <button
          onClick={() => setIsCustomizing(true)}
          className="btn-customize"
          title={t('customizeDashboard')}
        >
          <span>⚙️</span>
          <span>{t('customize')}</span>
        </button>
      </div>

      {/* Widgets Grid */}
      <div className="dashboard-widgets-grid">
        {enabledWidgets.map((widget) => (
          <WidgetContainer
            key={widget.id}
            widget={widget}
            data={widgetData}
            onNavigateToExpenses={onNavigateToExpenses}
            onNavigateToExpense={onNavigateToExpense}
            onNavigateToScheduledPayment={onNavigateToScheduledPayment}
            onNavigateToIncomes={onNavigateToIncomes}
            onNavigateToBudgets={onNavigateToBudgets}
            onNavigateToPaymentMethods={onNavigateToPaymentMethods}
          />
        ))}
      </div>

      {/* No widgets message */}
      {enabledWidgets.length === 0 && (
        <div className="no-widgets-message">
          <span>📊</span>
          <p>{t('noWidgetsEnabled')}</p>
          <button onClick={() => setIsCustomizing(true)} className="btn btn-primary">
            {t('customizeDashboard')}
          </button>
        </div>
      )}

      {/* Customizer Modal */}
      {isCustomizing && (
        <DashboardCustomizer
          widgets={widgets}
          onSave={handleSaveWidgets}
          onClose={() => setIsCustomizing(false)}
        />
      )}
    </div>
  );
};

export default CustomizableDashboard;
