import React, { useState, useEffect } from 'react';
import { Budget, BudgetPeriod, Category, CurrencyCode, Expense, OverallBudgetLimits, Repayment } from '../../types';
import ConfirmModal from '../ConfirmModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { PlusIcon, EditIcon, DeleteIcon } from '../icons';
import BudgetForm, { type BudgetFormData } from './BudgetForm';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';
import { getAllBudgetSuggestions } from '../../utils/budgetSuggestions';
import BudgetSuggestionCard from './BudgetSuggestionCard';
import BudgetHistory from './BudgetHistory';
import { getEffectiveBudgetAmount } from '../../utils/budgetRollover';
import BudgetTemplates from './BudgetTemplates';
import SubTabs from '../common/SubTabs';
import { getTodayLocal, formatDateRangeShort } from '../../utils/dateUtils';
import { getAllBudgetSuggestions as getAdjustmentSuggestions } from '../../utils/budgetAnalysis';
import BudgetAdjustmentCard from './BudgetAdjustmentCard';
import PopupModal from '../common/PopupModal';
import { useNotification } from '../../contexts/NotificationContext';
import { sortCategoryEntries } from '../../utils/categoryOrder';
import { DEFAULT_BASE_CURRENCY, formatMoney } from '../../utils/currencyUtils';
import { useCurrencyConversionMapState } from '../../hooks/useCurrencyConversionMap';
import {
  convertBudgetAmount,
  getBudgetCurrency,
  getBudgetExchangeRate,
  toBudgetBaseAmount,
  toBudgetCurrencyAmount,
} from '../../utils/budgetCurrencyUtils';
import { getAllocatedBudgetMinorUnits, validateBudgetAllocationBatch } from '../../utils/budgetAllocation';

// Add responsive styles for action buttons
const responsiveStyles = `
  .desktop-actions {
    display: none;
    gap: 8px;
  }
  .mobile-actions {
    display: block;
  }
  @media (min-width: 640px) {
    .desktop-actions {
      display: flex;
    }
    .mobile-actions {
      display: none;
    }
  }
`;

const safelyConvertBudgetAmount = (convert: () => number): number | null => {
  try {
    const converted = convert();
    return Number.isFinite(converted) ? converted : null;
  } catch {
    return null;
  }
};

const safelyConvertToBaseAmount = (amount: number, budget: Budget): number | null =>
  safelyConvertBudgetAmount(() => toBudgetBaseAmount(amount, budget));

const safelyConvertToBudgetCurrency = (amount: number, budget: Budget): number | null =>
  safelyConvertBudgetAmount(() => toBudgetCurrencyAmount(amount, budget));

interface BudgetManagerProps {
  budgets: Budget[];
  categories: Category[];
  expenses?: Expense[];
  repayments?: Repayment[];
  onAdd: (budget: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => boolean | void | Promise<boolean | void>;
  onUpdate: (id: string, updates: Partial<Budget>) => boolean | void | Promise<boolean | void>;
  onDelete: (id: string) => void;
  spentByCategory: { [key: string]: number };
  billingCycleDay?: number;
  displayCurrency?: CurrencyCode;
  overallBudgetLimits?: OverallBudgetLimits;
  onSaveOverallBudgetLimit: (period: BudgetPeriod, amount: number) => Promise<boolean>;
}

const BudgetManager: React.FC<BudgetManagerProps> = ({
  budgets,
  categories,
  expenses = [],
  repayments = [],
  onAdd,
  onUpdate,
  onDelete,
  spentByCategory,
  billingCycleDay = 1,
  displayCurrency = DEFAULT_BASE_CURRENCY,
  overallBudgetLimits,
  onSaveOverallBudgetLimit,
}) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const { showNotification } = useNotification();
  const [isAdding, setIsAdding] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'category-order' | 'usage-high' | 'usage-low' | 'name' | 'amount'>('category-order');
  const [filterBy, setFilterBy] = useState<'all' | 'over' | 'warning' | 'normal'>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'suggestions' | 'adjustments'>('list');
  const [dismissedAdjustments, setDismissedAdjustments] = useState<Set<string>>(new Set());
  const [summaryPeriod, setSummaryPeriod] = useState<BudgetPeriod>('monthly');
  const [showOverallBudgetModal, setShowOverallBudgetModal] = useState(false);
  const [overallBudgetInput, setOverallBudgetInput] = useState('');
  const [pendingBudgetDraft, setPendingBudgetDraft] = useState<BudgetFormData | undefined>();
  const [resumeAddBudgetAfterOverallModal, setResumeAddBudgetAfterOverallModal] = useState(false);
  const shouldOpenAddModalRef = React.useRef(false);


  // Get budget adjustment suggestions
  const adjustmentSuggestions = React.useMemo(() => {
    if (!showAdjustments || expenses.length === 0 || budgets.length === 0) return [];
    
    const validRateBudgets = budgets.filter((budget) => Number.isFinite(getBudgetExchangeRate(budget)));
    const suggestions = getAdjustmentSuggestions(validRateBudgets, expenses, repayments, billingCycleDay);
    return sortCategoryEntries(
      suggestions.filter((suggestion) => !dismissedAdjustments.has(suggestion.budgetId))
        .map((suggestion): [string, typeof suggestion] => [suggestion.categoryName, suggestion]),
      categories,
    ).map(([, suggestion]) => suggestion);
  }, [showAdjustments, budgets, categories, expenses, repayments, billingCycleDay, dismissedAdjustments]);

  // Handle applying adjustment suggestion
  const handleApplyAdjustment = async (budgetId: string, newAmount: number) => {
    const saved = await onUpdate(budgetId, { amount: newAmount });
    if (saved !== false) setDismissedAdjustments((prev) => new Set([...prev, budgetId]));
  };

  // Handle dismissing adjustment suggestion
  const handleDismissAdjustment = (budgetId: string) => {
    setDismissedAdjustments((prev) => new Set([...prev, budgetId]));
  };

  // Handle applying a budget template
  const handleApplyTemplate = async (budgetsFromTemplate: Array<{ categoryName: string; categoryId: string; amount: number; alertThreshold: number }>) => {
    const newBudgets = budgetsFromTemplate
      .filter((templateBudget) => !budgets.some((existing) => existing.categoryId === templateBudget.categoryId))
      .map((templateBudget) => ({
        categoryId: templateBudget.categoryId,
        categoryName: templateBudget.categoryName,
        amount: templateBudget.amount,
        period: 'monthly' as const,
        startDate: getTodayLocal(),
        alertThreshold: templateBudget.alertThreshold,
        currency: DEFAULT_BASE_CURRENCY,
        exchangeRate: 1,
      }));

    const validation = validateBudgetAllocationBatch(budgets, newBudgets, overallBudgetLimits);
    if (!validation.valid && validation.reason !== 'limit-below-allocation') {
      showNotification('error', t('budgetAllocationCannotBeCompared'));
      return;
    }

    for (const budget of newBudgets) {
      if (await onAdd(budget) === false) return;
    }
    setShowTemplates(false);
  };

  // Get budget suggestions
  const budgetSuggestions = React.useMemo(() => {
    if (!showSuggestions || expenses.length === 0) return [];
    
    // Get categories that don't have budgets yet
    const existingBudgetCategories = new Set(budgets.map((b) => b.categoryName));
    const allSuggestions = getAllBudgetSuggestions(expenses, repayments, billingCycleDay, 3);
    
    return sortCategoryEntries(
      allSuggestions.filter((suggestion) => !existingBudgetCategories.has(suggestion.categoryName))
        .map((suggestion): [string, typeof suggestion] => [suggestion.categoryName, suggestion]),
      categories,
    ).map(([, suggestion]) => suggestion);
  }, [showSuggestions, expenses, repayments, budgets, categories, billingCycleDay]);

  const handleApplySuggestion = (categoryName: string, amount: number) => {
    const category = categories.find((c) => c.name === categoryName);
    if (category) {
      void Promise.resolve(onAdd({
        categoryId: category.id!,
        categoryName: categoryName,
        amount: amount,
        period: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        alertThreshold: 80,
      })).then((saved) => {
        if (saved !== false) setShowSuggestions(false);
      });
    }
  };

  // Sub tabs configuration to match Scheduled Payments style
  const subTabs = [
    { id: 'list', label: t('budgetList') || '預算列表', icon: '📋' },
    { id: 'suggestions', label: t('budgetSuggestions') || '預算建議', icon: '💡' },
    { id: 'adjustments', label: t('budgetAdjustments') || '預算調整', icon: '📊' },
  ];

  // Sync boolean flags with sub tab selection for backward compatibility
  useEffect(() => {
    setShowAdjustments(activeSubTab === 'adjustments');
    setShowSuggestions(activeSubTab === 'suggestions');
    
    // Only close the add modal if we're not intentionally switching to add a budget
    if (!shouldOpenAddModalRef.current) {
      setIsAdding(false);
    } else if (activeSubTab === 'list') {
      // We switched to list tab to add a budget, now open the modal
      setIsAdding(true);
      shouldOpenAddModalRef.current = false;
    }
  }, [activeSubTab]);


  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest('.mobile-actions')) {
        setOpenMenuId(null);
      }
      if (headerMenuOpen && !target.closest('.header-menu-container')) {
        setHeaderMenuOpen(false);
      }
    };

    if (openMenuId || headerMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId, headerMenuOpen]);

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; budgetId: string | null }>({
    isOpen: false,
    budgetId: null,
  });

  // Calculate budget status for filtering and sorting
  const getBudgetStatus = React.useCallback((budget: Budget): { percentage: number; status: 'over' | 'warning' | 'normal' } => {
    const spent = safelyConvertToBudgetCurrency(spentByCategory[budget.categoryName] || 0, budget);
    const effectiveAmount = getEffectiveBudgetAmount(budget);
    const percentage = spent !== null && effectiveAmount > 0 ? (spent / effectiveAmount) * 100 : Number.NaN;
    if (!Number.isFinite(percentage)) return { percentage: 0, status: 'warning' };
    
    if (percentage >= 100) return { percentage, status: 'over' };
    if (percentage >= budget.alertThreshold) return { percentage, status: 'warning' };
    return { percentage, status: 'normal' };
  }, [spentByCategory]);

  const budgetDisplayEntries = React.useMemo(() => budgets.flatMap((budget) => {
    const budgetId = budget.id || `${budget.categoryId}-${budget.categoryName}`;
    const rateDate = budget.exchangeRateDate || budget.startDate || getTodayLocal();
    const spentBase = spentByCategory[budget.categoryName] || 0;
    const effectiveAmount = getEffectiveBudgetAmount(budget);
    const rolloverAmount = budget.accumulatedRollover || 0;
    const entries: Array<{ key: string; amount: number; sourceCurrency: CurrencyCode; date: string }> = [];
    if (Number.isFinite(spentBase)) {
      entries.push({ key: `${budgetId}:spent`, amount: spentBase, sourceCurrency: DEFAULT_BASE_CURRENCY, date: rateDate });
    }
    const effectiveBaseAmount = safelyConvertToBaseAmount(effectiveAmount, budget);
    if (effectiveBaseAmount !== null) {
      entries.push({ key: `${budgetId}:effective`, amount: effectiveBaseAmount, sourceCurrency: DEFAULT_BASE_CURRENCY, date: rateDate });
    }
    const rolloverBaseAmount = safelyConvertToBaseAmount(rolloverAmount, budget);
    if (rolloverBaseAmount !== null) {
      entries.push({ key: `${budgetId}:rollover`, amount: rolloverBaseAmount, sourceCurrency: DEFAULT_BASE_CURRENCY, date: rateDate });
    }
    return entries;
  }), [budgets, spentByCategory]);
  const budgetDisplayConversion = useCurrencyConversionMapState(budgetDisplayEntries, displayCurrency);
  const budgetDisplayAmounts = budgetDisplayConversion.amountsByKey;

  const getBudgetDisplayAmount = React.useCallback((
    key: string,
    budgetAmount: number | null,
    baseAmount: number | null,
    budget: Budget,
  ): number | null => {
    if (displayCurrency === getBudgetCurrency(budget)) return budgetAmount;
    if (displayCurrency === DEFAULT_BASE_CURRENCY) return baseAmount;
    return budgetDisplayAmounts[key] ?? null;
  }, [budgetDisplayAmounts, displayCurrency]);

  const formatDisplayMoney = (amount: number | null): string =>
    amount === null ? '—' : formatMoney(amount, displayCurrency);
  const conversionFailureMessage = !budgetDisplayConversion.isLoading && budgetDisplayConversion.failedKeys.length > 0
    ? (t('exchangeRateLookupFailed') || 'Unable to get the exchange rate. Please try again.')
    : undefined;
  const hasInvalidBudgetExchangeRate = budgets.some((budget) =>
    getBudgetCurrency(budget) !== DEFAULT_BASE_CURRENCY && !Number.isFinite(getBudgetExchangeRate(budget))
  );
  const budgetCurrencyError = hasInvalidBudgetExchangeRate
    ? t('budgetCurrencyDataInvalid')
    : conversionFailureMessage;
  const allocatedMinorUnits = getAllocatedBudgetMinorUnits(budgets, summaryPeriod);
  const overallBudgetLimit = overallBudgetLimits?.[summaryPeriod];
  const allocationDifference = overallBudgetLimit !== undefined && allocatedMinorUnits !== null
    ? overallBudgetLimit - allocatedMinorUnits / 100
    : null;
  const unallocatedBudget = allocationDifference !== null && allocationDifference >= 0
    ? allocationDifference
    : null;
  const modalAllocatedMinorUnits = getAllocatedBudgetMinorUnits(budgets, summaryPeriod);
  const modalInputAmount = overallBudgetInput.trim() === '' ? null : Number(overallBudgetInput);
  const modalInputMinorUnits = modalInputAmount !== null && Number.isFinite(modalInputAmount)
    ? Math.round(modalInputAmount * 100)
    : null;
  const modalAvailableMinorUnits = modalAllocatedMinorUnits !== null && modalInputMinorUnits !== null
    ? modalInputMinorUnits - modalAllocatedMinorUnits
    : null;

  const openOverallBudgetModal = (period: BudgetPeriod = summaryPeriod) => {
    setSummaryPeriod(period);
    const limit = overallBudgetLimits?.[period];
    const allocatedForPeriod = getAllocatedBudgetMinorUnits(budgets, period);
    const suggestedLimit = allocatedForPeriod === null ? '' : (allocatedForPeriod / 100).toFixed(2);
    setOverallBudgetInput(limit === undefined ? suggestedLimit : limit.toFixed(2));
    setShowOverallBudgetModal(true);
  };

  const closeOverallBudgetModal = () => {
    setShowOverallBudgetModal(false);
    if (resumeAddBudgetAfterOverallModal) {
      setResumeAddBudgetAfterOverallModal(false);
      setIsAdding(true);
    }
  };

  const handleManageOverallBudgetFromAdd = (draft: BudgetFormData) => {
    setPendingBudgetDraft(draft);
    setResumeAddBudgetAfterOverallModal(true);
    setIsAdding(false);
    openOverallBudgetModal(draft.period);
  };

  const closeAddBudgetModal = () => {
    setIsAdding(false);
    setPendingBudgetDraft(undefined);
  };

  const saveOverallBudget = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(overallBudgetInput);
    if (!Number.isFinite(amount) || amount < 0) return;
    if (modalAllocatedMinorUnits === null || Math.round(amount * 100) < modalAllocatedMinorUnits) return;
    if (await onSaveOverallBudgetLimit(summaryPeriod, amount)) closeOverallBudgetModal();
  };
  
  // Filter and sort budgets
  const filteredAndSortedBudgets = React.useMemo(() => {
    let result = budgets.filter((budget) =>
      budget.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply filter
    if (filterBy !== 'all') {
      result = result.filter((budget) => {
        const { status } = getBudgetStatus(budget);
        return status === filterBy;
      });
    }

    if (sortBy === 'category-order') {
      return sortCategoryEntries(
        result.map((budget): [string, Budget] => [budget.categoryName, budget]),
        categories,
      ).map(([, budget]) => budget);
    }

    // Apply sort
    result.sort((a, b) => {
      const statusA = getBudgetStatus(a);
      const statusB = getBudgetStatus(b);

      switch (sortBy) {
        case 'usage-high':
          return statusB.percentage - statusA.percentage;
        case 'usage-low':
          return statusA.percentage - statusB.percentage;
        case 'name':
          return a.categoryName.localeCompare(b.categoryName);
        case 'amount':
          return (safelyConvertToBaseAmount(getEffectiveBudgetAmount(b), b) ?? 0) -
            (safelyConvertToBaseAmount(getEffectiveBudgetAmount(a), a) ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [budgets, categories, searchTerm, filterBy, sortBy, getBudgetStatus]);

  const {
    isSelectionMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setIsSelectionMode
  } = useMultiSelect<Budget>();





  const startEdit = (budget: Budget) => {
    setEditingBudget(budget);
  };





  const getProgressPercentage = (budget: Budget): number | null => {
    const spent = safelyConvertToBudgetCurrency(spentByCategory[budget.categoryName] || 0, budget);
    const effectiveAmount = getEffectiveBudgetAmount(budget);
    if (spent === null || !Number.isFinite(effectiveAmount)) return null;
    return effectiveAmount > 0 ? Math.min((spent / effectiveAmount) * 100, 100) : 0;
  };

  const getProgressColor = (percentage: number | null, threshold: number) => {
    if (percentage === null) return 'var(--warning-text)';
    if (percentage >= 100) return 'var(--error-text)'; // Red - over budget
    if (percentage >= 90) return '#ea580c'; // Orange-red
    if (percentage >= threshold) return 'var(--warning-text)'; // Orange - warning
    if (percentage >= 60) return '#fbbf24'; // Yellow
    if (percentage >= 40) return '#a3e635'; // Light green
    return 'var(--success-text)'; // Green - safe
  };

  // Calculate period range for monthly budgets
  const getPeriodRange = (period: string): string => {
    if (period !== 'monthly') return '';
    
    const now = new Date();
    const currentDay = now.getDate();
    let cycleStart: Date;
    let cycleEnd: Date;

    if (currentDay >= billingCycleDay) {
      cycleStart = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingCycleDay - 1);
    } else {
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth(), billingCycleDay - 1);
    }

    // Convert dates to YYYY-MM-DD format for the utility function
    const startStr = `${cycleStart.getFullYear()}-${String(cycleStart.getMonth() + 1).padStart(2, '0')}-${String(cycleStart.getDate()).padStart(2, '0')}`;
    const endStr = `${cycleEnd.getFullYear()}-${String(cycleEnd.getMonth() + 1).padStart(2, '0')}-${String(cycleEnd.getDate()).padStart(2, '0')}`;

    return formatDateRangeShort(startStr, endStr, dateFormat);
  };

  return (
    <div style={styles.container}>
      <style>{responsiveStyles}</style>
      {/* Sub Tabs - unified style like Scheduled Payments */}
      <SubTabs
        tabs={subTabs}
        activeTab={activeSubTab}
        onTabChange={(tabId) => setActiveSubTab(tabId as typeof activeSubTab)}
      />
      <div style={styles.header}>
        <h2 style={styles.title}>{t('budgetManagement')}</h2>
        <div style={styles.headerActions}>
          <button 
            onClick={() => {
              if (activeSubTab !== 'list') {
                // Mark that we want to open the add modal after switching tabs
                shouldOpenAddModalRef.current = true;
                setActiveSubTab('list');
              } else {
                // Already on list tab, just open the modal
                setIsAdding(true);
              }
            }} 
            style={styles.addButton}
            title={t('addBudget') || '新增預算'}
          >
            <PlusIcon size={18} />
            <span>{t('addBudget') || '新增預算'}</span>
          </button>
          <div className="header-menu-container" style={styles.headerMenuContainer}>
            <button
              className="menu-trigger-button"
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
              aria-label="More options"
              title="選單"
            >
              ⋮
            </button>
            {headerMenuOpen && (
              <div style={styles.headerMenu}>
                <button
                  className="menu-item-hover"
                  style={styles.headerMenuItem}
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setShowTemplates(true);
                  }}
                >
                  <span style={styles.menuIcon}>📋</span>
                  <span>{t('budgetTemplates') || '預算模板'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Budget Templates Modal */}
      {showTemplates && (
        <BudgetTemplates
          categories={categories}
          onApplyTemplate={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Budget Adjustment Suggestions Section (subtab) */}
      {activeSubTab === 'adjustments' && (
        <div style={styles.adjustmentsSection}>
          <div style={styles.suggestionsHeader}>
            <span style={styles.suggestionsTitle}>{t('adjustmentSuggestions') || 'Adjustment Suggestions'}</span>
            <span style={styles.suggestionsSubtitle}>{t('basedOnHistory') || 'Based on your spending history'}</span>
          </div>
          {adjustmentSuggestions.length === 0 ? (
            <p style={styles.noSuggestions}>{t('noAdjustmentSuggestions') || 'No adjustment suggestions at this time'}</p>
          ) : (
            <div style={styles.adjustmentsGrid}>
              {adjustmentSuggestions.map((suggestion) => (
                <BudgetAdjustmentCard
                  key={suggestion.budgetId}
                  suggestion={suggestion}
                  onApply={handleApplyAdjustment}
                  onDismiss={handleDismissAdjustment}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Budget Suggestions Section (subtab) */}
      {activeSubTab === 'suggestions' && (
        <div style={styles.suggestionsSection}>
          <div style={styles.suggestionsHeader}>
            <span style={styles.suggestionsTitle}>{t('budgetSuggestions') || 'Budget Suggestions'}</span>
            <span style={styles.suggestionsSubtitle}>{t('basedOnHistory') || 'Based on your spending history'}</span>
          </div>
          {budgetSuggestions.length === 0 ? (
            <p style={styles.noSuggestions}>{t('noSuggestions') || 'No suggestions available'}</p>
          ) : (
            <div style={styles.suggestionsGrid}>
              {budgetSuggestions.map((suggestion) => (
                <BudgetSuggestionCard
                  key={suggestion.categoryName}
                  {...suggestion}
                  onApply={handleApplySuggestion}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Budget List (subtab) */}
      {activeSubTab === 'list' && (
      <>
      {/* Add Budget Popup Modal */}
      <PopupModal
        isOpen={isAdding}
        onClose={closeAddBudgetModal}
        title={t('addBudget') || 'Add Budget'}
        hideHeader={true}
        chromeless={true}
        hideFooter={true}
        maxWidth="600px"
      >
        <BudgetForm
          initialData={pendingBudgetDraft}
          categories={categories}
          onManageOverallBudget={handleManageOverallBudgetFromAdd}
          onSubmit={async (data) => {
            // Convert amount from cents to dollars
            const saved = await onAdd({
              ...data,
              amount: data.amount / 100,
            });
            if (saved !== false) closeAddBudgetModal();
          }}
          onCancel={closeAddBudgetModal}
        />
      </PopupModal>

      {/* Edit Budget Popup Modal */}
      <PopupModal
        isOpen={editingBudget !== null}
        onClose={() => setEditingBudget(null)}
        title={t('editBudget') || 'Edit Budget'}
        hideHeader={true}
        chromeless={true}
        hideFooter={true}
        maxWidth="600px"
      >
        {editingBudget && (
          <BudgetForm
            categories={categories}
            initialData={{
              categoryId: editingBudget.categoryId,
              categoryName: editingBudget.categoryName,
              amount: editingBudget.amount * 100, // Convert to cents for form
              period: editingBudget.period,
              startDate: editingBudget.startDate,
              alertThreshold: editingBudget.alertThreshold,
              currency: getBudgetCurrency(editingBudget),
              baseCurrency: editingBudget.baseCurrency || DEFAULT_BASE_CURRENCY,
              exchangeRate: editingBudget.exchangeRate,
              exchangeRateDate: editingBudget.exchangeRateDate,
              exchangeRateFetchedAt: editingBudget.exchangeRateFetchedAt,
              exchangeRateProvider: editingBudget.exchangeRateProvider,
              rolloverEnabled: editingBudget.rolloverEnabled,
              rolloverPercentage: editingBudget.rolloverPercentage,
              rolloverCap: editingBudget.rolloverCap,
            }}
            isEditing={true}
            onSubmit={async (data) => {
              const updates: Partial<Budget> = {
                ...data,
                amount: data.amount / 100, // Convert back to dollars
              };
              if (getBudgetCurrency(editingBudget) !== data.currency) {
                const convertedRollover = safelyConvertBudgetAmount(() => convertBudgetAmount(
                  editingBudget.accumulatedRollover || 0,
                  editingBudget,
                  data,
                ));
                if (convertedRollover === null) {
                  showNotification('error', t('budgetCurrencyDataInvalid'));
                  return;
                }
                updates.accumulatedRollover = convertedRollover;
              }
              const saved = await onUpdate(editingBudget.id!, updates);
              if (saved !== false) setEditingBudget(null);
            }}
            onCancel={() => setEditingBudget(null)}
          />
        )}
      </PopupModal>

      <section style={styles.totalBudgetSummary} aria-label={t('totalBudget')}>
        <div style={styles.overallBudgetHeader}>
          <div>
            <h3 style={styles.totalBudgetTitle}>{t('totalBudget')}</h3>
            <p style={styles.overallBudgetHint}>{t('overallBudgetHint')}</p>
          </div>
          <div style={styles.overallBudgetControls}>
            <label style={styles.budgetPeriodLabel} htmlFor="overall-budget-period">{t('budgetPeriodSummary')}</label>
            <select
              id="overall-budget-period"
              value={summaryPeriod}
              onChange={(event) => setSummaryPeriod(event.target.value as BudgetPeriod)}
              style={styles.controlSelect}
            >
              <option value="weekly">{t('periodWeekly')}</option>
              <option value="monthly">{t('periodMonthly')}</option>
              <option value="yearly">{t('periodYearly')}</option>
            </select>
            <button type="button" style={styles.overallBudgetButton} onClick={() => openOverallBudgetModal()}>
              {overallBudgetLimit === undefined ? t('setOverallBudget') : t('editOverallBudget')}
            </button>
          </div>
        </div>
        <div style={styles.overallBudgetMetrics}>
          <div style={styles.overallBudgetMetric}>
            <span style={styles.overallBudgetMetricLabel}>{t('overallBudgetLimit')}</span>
            <strong style={styles.totalBudgetValue}>
              {overallBudgetLimit === undefined ? t('overallBudgetNotSet') : formatMoney(overallBudgetLimit, DEFAULT_BASE_CURRENCY)}
            </strong>
          </div>
          <div style={styles.overallBudgetMetric}>
            <span style={styles.overallBudgetMetricLabel}>{t('allocatedBudget')}</span>
            <strong style={styles.overallBudgetMetricValue}>
              {allocatedMinorUnits === null ? '—' : formatMoney(allocatedMinorUnits / 100, DEFAULT_BASE_CURRENCY)}
            </strong>
          </div>
          <div style={styles.overallBudgetMetric}>
            <span style={styles.overallBudgetMetricLabel}>{t('unallocatedBudget')}</span>
            <strong style={allocationDifference !== null && allocationDifference < 0
              ? styles.overallBudgetOverageValue
              : styles.overallBudgetMetricValue}>
              {allocationDifference !== null && allocationDifference < 0
                ? `${t('budgetOverAllocation')} ${formatMoney(Math.abs(allocationDifference), DEFAULT_BASE_CURRENCY)}`
                : unallocatedBudget === null
                  ? t('setOverallBudgetToSeeAvailable')
                  : formatMoney(unallocatedBudget, DEFAULT_BASE_CURRENCY)}
            </strong>
            <span style={styles.overallBudgetMetricHint}>{t('unallocatedBudgetHint')}</span>
          </div>
        </div>
        {allocatedMinorUnits === null && (
          <span role="alert" style={styles.overallBudgetError}>{t('budgetAllocationCannotBeCompared')}</span>
        )}
      </section>

      {/* Search Bar - placed after form */}
      <p style={styles.allPeriodsBudgetNote}>{t('allPeriodsBudgetNote')}</p>
      <div style={styles.searchContainer}>
        <SearchBar
          placeholder={t('searchByName') || 'Search by category name...'}
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      {/* Sort and Filter Controls */}
      <div style={styles.controlsRow}>
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>{t('sortBy') || 'Sort'}:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={styles.controlSelect}
          >
            <option value="category-order">{t('categoryOrder')}</option>
            <option value="usage-high">{t('usageHighToLow') || 'Usage: High → Low'}</option>
            <option value="usage-low">{t('usageLowToHigh') || 'Usage: Low → High'}</option>
            <option value="name">{t('categoryName') || 'Category Name'}</option>
            <option value="amount">{t('budgetAmount') || 'Budget Amount'}</option>
          </select>
        </div>
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>{t('filter') || 'Filter'}:</label>
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
            style={styles.controlSelect}
          >
            <option value="all">{t('allBudgets') || 'All'}</option>
            <option value="over">{t('overBudgetOnly') || '🔴 Over Budget'}</option>
            <option value="warning">{t('warningOnly') || '🟡 Warning'}</option>
            <option value="normal">{t('normalOnly') || '🟢 Normal'}</option>
          </select>
        </div>
        <span style={styles.resultCount}>
          {filteredAndSortedBudgets.length} / {budgets.length}
        </span>
      </div>

      {activeSubTab === 'list' && (
        <div style={styles.listActionRow}>
          <MultiSelectToolbar
            isSelectionMode={isSelectionMode}
            selectedCount={selectedIds.size}
            onToggleSelectionMode={() => {
              if (isSelectionMode) {
                clearSelection();
                setIsSelectionMode(false);
              } else {
                setIsSelectionMode(true);
              }
            }}
            onSelectAll={() => selectAll(filteredAndSortedBudgets)}
            onDeleteSelected={() => {
              if (selectedIds.size > 0) {
                setDeleteConfirm({ isOpen: true, budgetId: null });
              }
            }}
          />
        </div>
      )}

      <div style={styles.budgetList}>
        {filteredAndSortedBudgets.length === 0 ? (
          <div style={styles.noData}>
            <p>{budgets.length === 0 ? t('noBudgetsYet') : t('noResults') || 'No results found'}</p>
          </div>
        ) : (
          filteredAndSortedBudgets.map((budget) => {
            const budgetId = budget.id || `${budget.categoryId}-${budget.categoryName}`;
            const spentBase = spentByCategory[budget.categoryName] || 0;
            const spentInBudgetCurrency = safelyConvertToBudgetCurrency(spentBase, budget);
            const spent = getBudgetDisplayAmount(
              `${budgetId}:spent`,
              spentInBudgetCurrency,
              Number.isFinite(spentBase) ? spentBase : null,
              budget,
            );
            const effectiveAmount = getEffectiveBudgetAmount(budget);
            const effectiveAmountBase = safelyConvertToBaseAmount(effectiveAmount, budget);
            const displayEffectiveAmount = getBudgetDisplayAmount(
              `${budgetId}:effective`,
              effectiveAmount,
              effectiveAmountBase,
              budget,
            );
            const rolloverAmount = budget.accumulatedRollover || 0;
            const rolloverAmountBase = safelyConvertToBaseAmount(rolloverAmount, budget);
            const displayRolloverAmount = getBudgetDisplayAmount(
              `${budgetId}:rollover`,
              rolloverAmount,
              rolloverAmountBase,
              budget,
            );
            const percentage = getProgressPercentage(budget);
            const progressColor = getProgressColor(percentage, budget.alertThreshold);
            const hasUnavailableBudgetValue = spent === null || displayEffectiveAmount === null ||
              displayRolloverAmount === null || percentage === null;

            return (
              <div key={budget.id} className={`budget-card ${isSelectionMode && selectedIds.has(budget.id!) ? 'selected' : ''}`} style={openMenuId === budget.id ? { zIndex: 9999 } : undefined}>
                {isSelectionMode && (
                    <div className="selection-checkbox-wrapper" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                        <input
                            type="checkbox"
                            checked={selectedIds.has(budget.id!)}
                            onChange={() => toggleSelection(budget.id!)}
                            className="multi-select-checkbox"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
                {/* View Mode - edit is now done via popup */}
                <>
                  {/* First row: Period and Amount */}
                  <div style={styles.budgetRow1}>
                    <div style={styles.periodInfo}>
                      <span style={styles.budgetPeriod}>{({ daily: t('periodDaily'), weekly: t('periodWeekly'), monthly: t('periodMonthly'), yearly: t('periodYearly') } as Record<string,string>)[budget.period]}</span>
                      {budget.period === 'monthly' && (
                        <span style={styles.periodRange}>{getPeriodRange(budget.period)}</span>
                      )}
                    </div>
                    <div style={styles.budgetAmount}>
                      <span
                        style={{ ...styles.spent, color: progressColor }}
                        title={spent === null ? budgetCurrencyError : undefined}
                      >
                        {formatDisplayMoney(spent)}
                      </span>
                      <span style={styles.separator}> / </span>
                      <span
                        style={styles.total}
                        title={displayEffectiveAmount === null ? budgetCurrencyError : undefined}
                      >
                        {formatDisplayMoney(displayEffectiveAmount)}
                      </span>
                    </div>
                  </div>

                  {hasUnavailableBudgetValue && budgetCurrencyError && (
                    <span role="alert" style={styles.conversionError}>{budgetCurrencyError}</span>
                  )}

                    {/* Second row: Category name and rollover badge */}
                    <div style={styles.budgetRow2}>
                      <h4 style={styles.budgetCategory}>{budget.categoryName}</h4>
                      {budget.rolloverEnabled && (
                        <span style={styles.rolloverBadge} title={t('rolloverEnabled') || 'Rollover Enabled'}>🔄</span>
                      )}
                      {budget.accumulatedRollover && budget.accumulatedRollover > 0 && (
                        <span style={styles.rolloverAmount} title={`${t('accumulatedRollover') || 'Accumulated Rollover'}: ${formatDisplayMoney(displayRolloverAmount)}`}>
                          +{formatDisplayMoney(displayRolloverAmount)}
                        </span>
                      )}
                    </div>

                    {/* Third row: Progress bar, percentage, and Hamburger */}
                    <div style={styles.budgetRow3}>
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                          width: `${percentage ?? 0}%`,
                            backgroundColor: progressColor,
                          }}
                        />
                      </div>
                      <span style={styles.percentage}>{percentage === null ? '—' : `${percentage.toFixed(1)}%`}</span>
                      
                      {/* Desktop: Show individual buttons */}
                      <div className="desktop-actions" style={{ gap: '8px' }}>
                        <button onClick={() => startEdit(budget)} className="btn-icon btn-icon-primary" aria-label={t('edit')}>
                          <EditIcon size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, budgetId: budget.id! })}
                          className="btn-icon btn-icon-danger"
                        >
                          <DeleteIcon size={18} />
                        </button>
                      </div>

                      {/* Mobile: Show hamburger menu */}
                      <div className="mobile-actions">
                        <div style={styles.menuContainer}>
                          <button
                            className="menu-trigger-button"
                            onClick={() => setOpenMenuId(openMenuId === budget.id ? null : budget.id!)}
                            aria-label="More"
                          >
                            ⋮
                          </button>
                          {openMenuId === budget.id && (
                            <div style={styles.menu}>
                              <button
                                className="menu-item-hover"
                                style={styles.menuItem}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  startEdit(budget);
                                }}
                              >
                                <span style={styles.menuIcon}><EditIcon size={16} /></span>
                                {t('edit')}
                              </button>
                              <button
                                className="menu-item-hover"
                                style={{ ...styles.menuItem, color: 'var(--error-text)' }}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setDeleteConfirm({ isOpen: true, budgetId: budget.id! });
                                }}
                              >
                                <span style={styles.menuIcon}><DeleteIcon size={16} /></span>
                                {t('delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* History toggle button */}
                    {budget.period === 'monthly' && expenses.length > 0 && (
                      <button
                        style={styles.historyToggle}
                        onClick={() => {
                          const newSet = new Set(expandedHistoryIds);
                          if (newSet.has(budget.id!)) {
                            newSet.delete(budget.id!);
                          } else {
                            newSet.add(budget.id!);
                          }
                          setExpandedHistoryIds(newSet);
                        }}
                      >
                        {expandedHistoryIds.has(budget.id!) 
                          ? (t('hideHistory') || 'Hide History') 
                          : (t('showHistory') || 'Show History')}
                        <span style={{ marginLeft: '4px' }}>{expandedHistoryIds.has(budget.id!) ? '▲' : '▼'}</span>
                      </button>
                    )}

                    {/* Budget History */}
                    {expandedHistoryIds.has(budget.id!) && budget.period === 'monthly' &&
                      Number.isFinite(getBudgetExchangeRate(budget)) && (
                      <BudgetHistory
                        categoryName={budget.categoryName}
                        budgetAmount={budget.amount}
                        budgetCurrency={getBudgetCurrency(budget)}
                        budgetExchangeRate={getBudgetExchangeRate(budget)}
                        budgetExchangeRateDate={budget.exchangeRateDate}
                        displayCurrency={displayCurrency}
                        expenses={expenses}
                        repayments={repayments}
                        billingCycleDay={billingCycleDay}
                        periodsToShow={6}
                        showAdvanced={true}
                      />
                    )}
                  </>
              </div>
            );
          })
        )}
      </div>
      </>
      )}
      
      <PopupModal
        isOpen={showOverallBudgetModal}
        onClose={closeOverallBudgetModal}
        title={overallBudgetLimit === undefined ? t('setOverallBudget') : t('editOverallBudget')}
        isForm
        onSubmit={saveOverallBudget}
        primaryButtonLabel={t('save')}
        maxWidth="480px"
      >
        <div style={styles.overallBudgetForm}>
          <label htmlFor="overall-budget-amount">{t('overallBudgetAmount')}</label>
          <input
            id="overall-budget-amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={overallBudgetInput}
            onChange={(event) => setOverallBudgetInput(event.target.value)}
            aria-invalid={modalAvailableMinorUnits !== null && modalAvailableMinorUnits < 0}
            aria-describedby="overall-budget-form-help overall-budget-form-summary"
            style={styles.overallBudgetInput}
          />
          <p id="overall-budget-form-help" style={styles.overallBudgetFormHint}>
            {overallBudgetLimit === undefined
              ? `${t('overallBudgetSuggestedHint')}${modalAllocatedMinorUnits === null ? '' : ` ${formatMoney(modalAllocatedMinorUnits / 100, DEFAULT_BASE_CURRENCY)}`}`
              : `${t('overallBudgetSavedHint')} ${formatMoney(overallBudgetLimit, DEFAULT_BASE_CURRENCY)}`}
          </p>
          <div id="overall-budget-form-summary" style={styles.overallBudgetFormSummary} aria-live="polite">
            <div style={styles.overallBudgetFormSummaryRow}>
              <span>{t('allocatedBudget')}</span>
              <strong>{modalAllocatedMinorUnits === null ? '—' : formatMoney(modalAllocatedMinorUnits / 100, DEFAULT_BASE_CURRENCY)}</strong>
            </div>
            <div style={styles.overallBudgetFormSummaryRow}>
              <span>{t('unallocatedBudget')}</span>
              <strong style={modalAvailableMinorUnits !== null && modalAvailableMinorUnits < 0
                ? styles.overallBudgetOverageValue
                : styles.overallBudgetMetricValue}>
                {modalAvailableMinorUnits === null
                  ? '—'
                  : modalAvailableMinorUnits < 0
                    ? `${t('budgetOverAllocation')} ${formatMoney(Math.abs(modalAvailableMinorUnits) / 100, DEFAULT_BASE_CURRENCY)}`
                    : formatMoney(modalAvailableMinorUnits / 100, DEFAULT_BASE_CURRENCY)}
              </strong>
            </div>
            <span style={styles.overallBudgetMetricHint}>{t('unallocatedBudgetHint')}</span>
          </div>
          {modalAllocatedMinorUnits === null && (
            <span role="alert" style={styles.overallBudgetError}>{t('budgetAllocationCannotBeCompared')}</span>
          )}
          {modalAvailableMinorUnits !== null && modalAvailableMinorUnits < 0 && (
            <span role="alert" style={styles.overallBudgetError}>{t('overallBudgetBelowAllocation')}</span>
          )}
        </div>
      </PopupModal>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('deleteBudget')}
        message={deleteConfirm.budgetId ? t('confirmDeleteBudget') : t('confirmDeleteSelected')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.budgetId) {
            onDelete(deleteConfirm.budgetId);
          } else if (isSelectionMode) {
             selectedIds.forEach(id => onDelete(id));
             clearSelection();
             setIsSelectionMode(false);
          }
          setDeleteConfirm({ isOpen: false, budgetId: null });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, budgetId: null })}
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  totalBudgetSummary: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '16px',
    background: 'var(--card-bg, white)',
    border: '1px solid var(--border-color, #e9ecef)',
    borderRadius: '12px',
  },
  totalBudgetMetric: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    minWidth: 0,
  },
  totalBudgetTitle: {
    margin: 0,
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  overallBudgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  overallBudgetHint: {
    margin: '6px 0 0',
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  overallBudgetControls: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  budgetPeriodLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  overallBudgetButton: {
    padding: '8px 12px',
    border: '1px solid var(--accent-primary)',
    borderRadius: '8px',
    background: 'var(--accent-primary)',
    color: 'white',
    fontWeight: 600 as const,
    cursor: 'pointer',
  },
  overallBudgetMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  overallBudgetMetric: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    padding: '12px',
    borderRadius: '8px',
    background: 'var(--bg-secondary, #f8f9fa)',
  },
  overallBudgetMetricLabel: {
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  overallBudgetMetricValue: {
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontWeight: 700 as const,
  },
  overallBudgetOverageValue: {
    color: 'var(--error-text, #dc2626)',
    fontSize: '16px',
    fontWeight: 700 as const,
  },
  overallBudgetError: {
    color: 'var(--error-text, #dc2626)',
    fontSize: '13px',
  },
  conversionError: {
    color: 'var(--error-text, #dc2626)',
    fontSize: '12px',
  },
  allPeriodsBudgetNote: {
    margin: '0 2px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
  },
  overallBudgetForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  overallBudgetFormHint: {
    margin: 0,
    color: 'var(--text-secondary)',
    fontSize: '12px',
    lineHeight: 1.5,
  },
  overallBudgetFormSummary: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    background: 'var(--bg-secondary)',
  },
  overallBudgetFormSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  overallBudgetMetricHint: {
    color: 'var(--text-secondary)',
    fontSize: '11px',
    lineHeight: 1.4,
  },
  overallBudgetInput: {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '10px 12px',
    border: '1px solid var(--border-color, #dee2e6)',
    borderRadius: '8px',
    background: 'var(--input-bg, var(--card-bg, white))',
    color: 'var(--text-primary)',
    fontSize: '16px',
  },
  totalBudgetValue: {
    color: 'var(--accent-primary)',
    fontSize: '24px',
    fontWeight: '700' as const,
    whiteSpace: 'nowrap' as const,
  },
  conversionError: {
    color: 'var(--error-color, #dc3545)',
    fontSize: '12px',
    textAlign: 'right' as const,
  },
  listActionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  displayCurrencyControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: 'auto',
    flexWrap: 'nowrap' as const,
  },
  displayCurrencyLabel: {
    fontSize: '13px',
    fontWeight: 600 as const,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
  templateButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    transition: 'all 0.2s',
  },
  headerMenuContainer: {
    position: 'relative' as const,
  },
  headerMenu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: '4px',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 9999,
    minWidth: '160px',
  },
  headerMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  adjustmentButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  suggestionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  adjustmentsSection: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
  },
  adjustmentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '12px',
  },
  suggestionsSection: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--accent-light)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
  },
  suggestionsHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    marginBottom: '12px',
  },
  suggestionsTitle: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  suggestionsSubtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  suggestionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
  },
  noSuggestions: {
    color: 'var(--text-tertiary)',
    fontSize: '14px',
    textAlign: 'center' as const,
    padding: '20px',
  },
  searchContainer: {
    display: 'flex',
    gap: '10px',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
    marginTop: '8px',
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  controlLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500' as const,
  },
  controlSelect: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    cursor: 'pointer',
  },
  resultCount: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    marginLeft: 'auto',
  },
  searchInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '14px',
  },
  form: {
    backgroundColor: 'var(--bg-secondary)',
    padding: '20px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    marginBottom: '12px',
    border: '1px solid var(--border-color)',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  formRow: {
    display: 'flex',
    gap: '15px',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: 'var(--text-secondary)',
  },
  budgetList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '12px',
    marginTop: '12px',
  },
  budgetRow1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  periodInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  periodRange: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontWeight: '400' as const,
  },
  budgetRow2: {
    display: 'flex',
    alignItems: 'center',
  },
  budgetRow3: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  budgetCategory: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
  },
  rolloverBadge: {
    marginLeft: '6px',
    fontSize: '12px',
    padding: '2px 6px',
    backgroundColor: 'var(--accent-light)',
    borderRadius: '4px',
  },
  rolloverAmount: {
    marginLeft: '6px',
    fontSize: '11px',
    fontWeight: '500' as const,
    color: 'var(--accent-primary)',
    backgroundColor: 'var(--accent-light)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  budgetPeriod: {
    padding: '5px 10px',
    background: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    borderRadius: '16px',
    fontSize: '11px',
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
    boxShadow: '0 1px 3px var(--shadow)',
  },
  budgetAmount: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    whiteSpace: 'nowrap' as const,
  },
  spent: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  separator: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  total: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  progressBar: {
    flex: 1,
    height: '6px',
    backgroundColor: 'var(--border-color)',
    borderRadius: '3px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  percentage: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500' as const,
    minWidth: '45px',
    textAlign: 'right' as const,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    padding: '8px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: '8px',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContainer: {
    position: 'relative' as const,
  },
  menuButton: {
    padding: '8px 12px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold' as const,
    lineHeight: '1',
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: '4px',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 9999,
    minWidth: '160px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  historyToggle: {
    width: '100%',
    padding: '8px',
    marginTop: '8px',
    backgroundColor: 'transparent',
    border: '1px dashed var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
};

export default BudgetManager;
