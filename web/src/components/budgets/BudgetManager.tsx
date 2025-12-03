import React, { useState, useEffect } from 'react';
import { Budget, Category, Expense, Repayment } from '../../types';
import ConfirmModal from '../ConfirmModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon } from '../icons';
import BudgetForm from './BudgetForm';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';
import { getAllBudgetSuggestions } from '../../utils/budgetSuggestions';
import BudgetSuggestionCard from './BudgetSuggestionCard';
import BudgetHistory from './BudgetHistory';
import { getEffectiveBudgetAmount } from '../../utils/budgetRollover';
import BudgetTemplates from './BudgetTemplates';
import SubTabs from '../common/SubTabs';
import { getTodayLocal } from '../../utils/dateUtils';
import { getAllBudgetSuggestions as getAdjustmentSuggestions } from '../../utils/budgetAnalysis';
import BudgetAdjustmentCard from './BudgetAdjustmentCard';

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

interface BudgetManagerProps {
  budgets: Budget[];
  categories: Category[];
  expenses?: Expense[];
  repayments?: Repayment[];
  onAdd: (budget: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Budget>) => void;
  onDelete: (id: string) => void;
  spentByCategory: { [key: string]: number };
  billingCycleDay?: number;
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
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'usage-high' | 'usage-low' | 'name' | 'amount'>('usage-high');
  const [filterBy, setFilterBy] = useState<'all' | 'over' | 'warning' | 'normal'>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'suggestions' | 'adjustments'>('list');
  const [dismissedAdjustments, setDismissedAdjustments] = useState<Set<string>>(new Set());

  // Get budget adjustment suggestions
  const adjustmentSuggestions = React.useMemo(() => {
    if (!showAdjustments || expenses.length === 0 || budgets.length === 0) return [];
    
    const suggestions = getAdjustmentSuggestions(budgets, expenses, repayments, billingCycleDay);
    return suggestions.filter((s) => !dismissedAdjustments.has(s.budgetId));
  }, [showAdjustments, budgets, expenses, repayments, billingCycleDay, dismissedAdjustments]);

  // Handle applying adjustment suggestion
  const handleApplyAdjustment = (budgetId: string, newAmount: number) => {
    onUpdate(budgetId, { amount: newAmount });
    setDismissedAdjustments((prev) => new Set([...prev, budgetId]));
  };

  // Handle dismissing adjustment suggestion
  const handleDismissAdjustment = (budgetId: string) => {
    setDismissedAdjustments((prev) => new Set([...prev, budgetId]));
  };

  // Handle applying a budget template
  const handleApplyTemplate = (budgetsFromTemplate: Array<{ categoryName: string; categoryId: string; amount: number; alertThreshold: number }>) => {
    // Create all budgets from the template
    budgetsFromTemplate.forEach((b) => {
      // Check if budget for this category already exists
      const exists = budgets.some((existing) => existing.categoryId === b.categoryId);
      if (!exists) {
        onAdd({
          categoryId: b.categoryId,
          categoryName: b.categoryName,
          amount: b.amount,
          period: 'monthly',
          startDate: getTodayLocal(),
          alertThreshold: b.alertThreshold,
        });
      }
    });
    setShowTemplates(false);
  };

  // Get budget suggestions
  const budgetSuggestions = React.useMemo(() => {
    if (!showSuggestions || expenses.length === 0) return [];
    
    // Get categories that don't have budgets yet
    const existingBudgetCategories = new Set(budgets.map((b) => b.categoryName));
    const allSuggestions = getAllBudgetSuggestions(expenses, repayments, billingCycleDay, 3);
    
    return allSuggestions.filter((s) => !existingBudgetCategories.has(s.categoryName));
  }, [showSuggestions, expenses, repayments, budgets, billingCycleDay]);

  const handleApplySuggestion = (categoryName: string, amount: number) => {
    const category = categories.find((c) => c.name === categoryName);
    if (category) {
      onAdd({
        categoryId: category.id!,
        categoryName: categoryName,
        amount: amount,
        period: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        alertThreshold: 80,
      });
      setShowSuggestions(false);
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
    setIsAdding(false);
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
  const getBudgetStatus = (budget: Budget): { percentage: number; status: 'over' | 'warning' | 'normal' } => {
    const spent = spentByCategory[budget.categoryName] || 0;
    const effectiveAmount = getEffectiveBudgetAmount(budget);
    const percentage = effectiveAmount > 0 ? (spent / effectiveAmount) * 100 : 0;
    
    if (percentage >= 100) return { percentage, status: 'over' };
    if (percentage >= budget.alertThreshold) return { percentage, status: 'warning' };
    return { percentage, status: 'normal' };
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
          return b.amount - a.amount;
        default:
          return 0;
      }
    });

    return result;
  }, [budgets, searchTerm, filterBy, sortBy, spentByCategory]);

  const {
    isSelectionMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setIsSelectionMode
  } = useMultiSelect<Budget>();





  const startInlineEdit = (budget: Budget) => {
    setEditingId(budget.id!);
  };





  const getProgressPercentage = (categoryName: string, budgetAmount: number) => {
    const spent = spentByCategory[categoryName] || 0;
    return Math.min((spent / budgetAmount) * 100, 100);
  };

  const getProgressColor = (percentage: number, threshold: number) => {
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

    const formatDate = (date: Date) => {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    };

    return `${formatDate(cycleStart)} - ${formatDate(cycleEnd)}`;
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
            onClick={() => setIsAdding(true)} 
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
      {/* Add Budget Form */}
      {isAdding && (
        <div className="form-card">
          <BudgetForm
            categories={categories}
            onSubmit={(data) => {
              // Convert amount from cents to dollars
              onAdd({
                ...data,
                amount: data.amount / 100,
              });
              setIsAdding(false);
            }}
            onCancel={() => {
              setIsAdding(false);
              setEditingId(null);
            }}
          />
        </div>
      )}

      {/* Search Bar - placed after form */}
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
      )}

      <div style={styles.budgetList}>
        {filteredAndSortedBudgets.length === 0 ? (
          <div style={styles.noData}>
            <p>{budgets.length === 0 ? t('noBudgetsYet') : t('noResults') || 'No results found'}</p>
          </div>
        ) : (
          filteredAndSortedBudgets.map((budget) => {
            const spent = spentByCategory[budget.categoryName] || 0;
            const effectiveAmount = getEffectiveBudgetAmount(budget);
            const percentage = getProgressPercentage(budget.categoryName, effectiveAmount);
            const progressColor = getProgressColor(percentage, budget.alertThreshold);

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
                {editingId === budget.id ? (
                  <BudgetForm
                    initialData={{
                      categoryId: budget.categoryId,
                      categoryName: budget.categoryName,
                      amount: Math.round(budget.amount * 100),
                      period: budget.period,
                      startDate: budget.startDate,
                      alertThreshold: budget.alertThreshold,
                      rolloverEnabled: budget.rolloverEnabled,
                      rolloverPercentage: budget.rolloverPercentage,
                      rolloverCap: budget.rolloverCap,
                    }}
                    categories={categories}
                    onSubmit={(data) => {
                      const updates: Partial<Budget> = {};
                      if (budget.categoryId !== data.categoryId) {
                        updates.categoryId = data.categoryId;
                        updates.categoryName = data.categoryName;
                      }
                      const amountInDollars = data.amount / 100;
                      if (budget.amount !== amountInDollars) updates.amount = amountInDollars;
                      if (budget.period !== data.period) updates.period = data.period;
                      if (budget.startDate !== data.startDate) updates.startDate = data.startDate;
                      if (budget.alertThreshold !== data.alertThreshold) updates.alertThreshold = data.alertThreshold;
                      // Rollover fields
                      if (budget.rolloverEnabled !== data.rolloverEnabled) updates.rolloverEnabled = data.rolloverEnabled;
                      if (budget.rolloverPercentage !== data.rolloverPercentage) updates.rolloverPercentage = data.rolloverPercentage;
                      if (budget.rolloverCap !== data.rolloverCap) updates.rolloverCap = data.rolloverCap;

                      if (Object.keys(updates).length > 0) {
                        onUpdate(budget.id!, updates);
                      }
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                    isEditing={true}
                  />
                ) : (
                  // View Mode
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
                        <span style={{ ...styles.spent, color: progressColor }}>${spent.toFixed(2)}</span>
                        <span style={styles.separator}> / </span>
                        <span style={styles.total}>${effectiveAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Second row: Category name and rollover badge */}
                    <div style={styles.budgetRow2}>
                      <h4 style={styles.budgetCategory}>{budget.categoryName}</h4>
                      {budget.rolloverEnabled && (
                        <span style={styles.rolloverBadge} title={t('rolloverEnabled') || 'Rollover Enabled'}>🔄</span>
                      )}
                      {budget.accumulatedRollover && budget.accumulatedRollover > 0 && (
                        <span style={styles.rolloverAmount} title={`${t('accumulatedRollover') || 'Accumulated Rollover'}: $${budget.accumulatedRollover.toFixed(2)}`}>
                          +${budget.accumulatedRollover.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Third row: Progress bar, percentage, and Hamburger */}
                    <div style={styles.budgetRow3}>
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${percentage}%`,
                            backgroundColor: progressColor,
                          }}
                        />
                      </div>
                      <span style={styles.percentage}>{percentage.toFixed(1)}%</span>
                      
                      {/* Desktop: Show individual buttons */}
                      <div className="desktop-actions" style={{ gap: '8px' }}>
                        <button onClick={() => startInlineEdit(budget)} className="btn-icon btn-icon-primary" aria-label={t('edit')}>
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
                                  startInlineEdit(budget);
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
                    {expandedHistoryIds.has(budget.id!) && budget.period === 'monthly' && (
                      <BudgetHistory
                        categoryName={budget.categoryName}
                        budgetAmount={budget.amount}
                        expenses={expenses}
                        repayments={repayments}
                        billingCycleDay={billingCycleDay}
                        periodsToShow={6}
                        showAdvanced={true}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
      </>
      )}
      
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
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
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
