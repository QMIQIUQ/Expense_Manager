import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Expense, Income, Repayment, Budget, Card, Category, EWallet, Bank, ScheduledPayment, ScheduledPaymentRecord } from '../../types';
import { DashboardWidget, DEFAULT_DASHBOARD_LAYOUT } from '../../types/dashboard';
import { QuickExpensePreset } from '../../types/quickExpense';
import { dashboardLayoutService } from '../../services/dashboardLayoutService';
import { quickExpenseService } from '../../services/quickExpenseService';
import { WidgetContainer, WidgetProps } from './widgets';
import DashboardCustomizer from './DashboardCustomizer';

interface CustomizableDashboardProps {
  expenses: Expense[];
  incomes: Income[];
  repayments: Repayment[];
  budgets: Budget[];
  cards: Card[];
  categories: Category[];
  ewallets: EWallet[];
  banks: Bank[];
  billingCycleDay: number;
  onMarkTrackingCompleted?: (expenseId: string) => void;
  onQuickAdd?: () => void;
  onQuickExpenseAdd?: (preset: QuickExpensePreset) => Promise<void>;
  onQuickExpensePresetsChange?: () => void;
  onNavigateToExpenses?: () => void;
  onNavigateToExpense?: (expenseId: string) => void;
  onNavigateToScheduledPayment?: (scheduledPaymentId: string) => void;
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
  expenses,
  incomes,
  repayments,
  budgets,
  cards,
  categories,
  ewallets,
  banks,
  billingCycleDay,
  onMarkTrackingCompleted,
  onQuickAdd,
  onQuickExpenseAdd,
  onQuickExpensePresetsChange,
  onNavigateToExpenses,
  onNavigateToExpense,
  onNavigateToScheduledPayment,
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
        const layout = await dashboardLayoutService.getOrCreate(currentUser.uid);
        setWidgets(layout.widgets.sort((a, b) => a.order - b.order));
      } catch (error) {
        console.error('Failed to load dashboard layout:', error);
        // Keep using DEFAULT_DASHBOARD_LAYOUT to maintain functionality even if custom layout fails to load
      }
    };

    loadLayout();
  }, [currentUser]);

  // Load quick expense presets
  const loadQuickExpensePresets = useCallback(async () => {
    if (!currentUser) return;
    try {
      const presets = await quickExpenseService.getPresets(currentUser.uid);
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
    setWidgets(newWidgets.sort((a, b) => a.order - b.order));
    
    try {
      // 2. Save to Firebase in background
      await dashboardLayoutService.updateWidgets(currentUser.uid, newWidgets);
      
      // 3. Notify success
      showNotification('success', t('saveSuccess') || '已保存自定義列表');
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
      
      // 4. Rollback on failure
      setWidgets(previousWidgets);
      
      // 5. Notify error
      showNotification('error', t('saveFailed') || '保存失敗，請稍後重試');
    }
  };

  // Widget data props
  const widgetData: WidgetProps = {
    expenses,
    incomes,
    repayments,
    budgets,
    cards,
    categories,
    ewallets,
    banks,
    billingCycleDay,
    onMarkTrackingCompleted,
    onQuickAdd,
    onNavigateToExpense,
    onNavigateToScheduledPayment,
    quickExpensePresets,
    onQuickExpenseAdd,
    onQuickExpensePresetsChange: onQuickExpensePresetsChange || loadQuickExpensePresets,
    scheduledPayments,
    scheduledPaymentRecords,
    onConfirmScheduledPayment,
  };

  // Get enabled widgets sorted by order
  const enabledWidgets = widgets
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order);

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
