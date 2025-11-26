import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Expense, Income, Repayment, Budget, Card, Category, EWallet, Bank } from '../../types';
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
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_DASHBOARD_LAYOUT);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [quickExpensePresets, setQuickExpensePresets] = useState<QuickExpensePreset[]>([]);

  // Load user's dashboard layout
  useEffect(() => {
    const loadLayout = async () => {
      if (!currentUser) return;
      
      try {
        const layout = await dashboardLayoutService.getOrCreate(currentUser.uid);
        setWidgets(layout.widgets.sort((a, b) => a.order - b.order));
      } catch (error) {
        console.error('Failed to load dashboard layout:', error);
        setWidgets(DEFAULT_DASHBOARD_LAYOUT);
      } finally {
        setIsLoading(false);
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

  // Save widget changes
  const handleSaveWidgets = async (newWidgets: DashboardWidget[]) => {
    if (!currentUser) return;
    
    try {
      await dashboardLayoutService.updateWidgets(currentUser.uid, newWidgets);
      setWidgets(newWidgets.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
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
    quickExpensePresets,
    onQuickExpenseAdd,
    onQuickExpensePresetsChange: loadQuickExpensePresets,
  };

  // Get enabled widgets sorted by order
  const enabledWidgets = widgets
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>{t('loading')}</p>
      </div>
    );
  }

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
