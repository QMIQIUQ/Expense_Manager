import React, { useState, useEffect, useMemo } from 'react';
import { RecurringExpense, Category, Card, Bank } from '../../types';
import ConfirmModal from '../ConfirmModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon, EditIcon, DeleteIcon } from '../icons';
import RecurringForm from './RecurringForm';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';
import { getDueRecurringExpenses } from '../../utils/recurringUtils';

// Add responsive styles for action buttons
const responsiveStyles = `
  .desktop-actions {
    display: none;
    gap: 8px;
  }
  .mobile-actions {
    display: block;
  }
  .form-row {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  @media (min-width: 640px) {
    .desktop-actions {
      display: flex;
    }
    .mobile-actions {
      display: none;
    }
    .form-row {
      flex-direction: row;
    }
  }
`;

interface RecurringExpenseManagerProps {
  recurringExpenses: RecurringExpense[];
  categories: Category[];
  banks?: Bank[];
  cards?: Card[];
  onAdd: (expense: Omit<RecurringExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<RecurringExpense>) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const RecurringExpenseManager: React.FC<RecurringExpenseManagerProps> = ({
  recurringExpenses,
  categories,
  banks = [],
  cards = [],
  onAdd,
  onUpdate,
  onDelete,
  onToggleActive,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDueBills, setShowDueBills] = useState(true); // Collapsible section for due bills
  const [viewedBillIds, setViewedBillIds] = useState<Set<string>>(new Set()); // Track which bills have been marked as viewed
  
  // Calculate due bills
  const dueBills = useMemo(() => getDueRecurringExpenses(recurringExpenses), [recurringExpenses]);


  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest('.mobile-actions')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; recurringId: string | null }>({
    isOpen: false,
    recurringId: null,
  });

  // Get category color from user's category settings
  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category && category.color) {
      // Convert hex color to lighter background and keep text as original color
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 99, g: 102, b: 241 };
      };
      
      const rgb = hexToRgb(category.color);
      // Create a lighter background (add 80% white)
      const bg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
      const text = category.color;
      
      return { background: bg, color: text };
    }
    // Fallback color
    return { background: '#e0e7ff', color: '#4338ca' };
  };
  
  // Filter recurring expenses by search term
  const filteredRecurringExpenses = recurringExpenses.filter((expense) =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    isSelectionMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setIsSelectionMode
  } = useMultiSelect<RecurringExpense>();





  const startInlineEdit = (expense: RecurringExpense) => {
    setEditingId(expense.id!);
  };

  // Handler to toggle due bills section
  const handleToggleDueBills = () => {
    setShowDueBills(!showDueBills);
  };
  
  // Calculate unviewed bills
  const unviewedBills = useMemo(() => 
    dueBills.filter(bill => bill.id && !viewedBillIds.has(bill.id)),
    [dueBills, viewedBillIds]
  );
  
  // Mark bills as viewed when section is opened (using useEffect)
  useEffect(() => {
    const hasUnviewedBills = unviewedBills.length > 0;
    const shouldMarkAsViewed = showDueBills && hasUnviewedBills;
    
    if (shouldMarkAsViewed) {
      // Delay marking as viewed to ensure user actually sees the content
      const timer = setTimeout(() => {
        const today = new Date().toISOString();
        const newViewedIds = new Set(viewedBillIds);
        
        unviewedBills.forEach((bill) => {
          if (bill.id) {
            onUpdate(bill.id, { lastViewedDue: today });
            newViewedIds.add(bill.id);
          }
        });
        
        setViewedBillIds(newViewedIds);
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timer);
    }
    // Note: Intentionally not including viewedBillIds in deps to avoid infinite loop
    // We only want to trigger when showDueBills or unviewedBills change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDueBills, unviewedBills, onUpdate]);







  return (
    <div style={styles.container}>
      <style>{responsiveStyles}</style>
      <div style={styles.header}>
        <h2 style={styles.title}>{t('recurringExpenses')}</h2>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <PlusIcon size={18} />
            <span>{t('addRecurring')}</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-5">
          <RecurringForm
            categories={categories}
            cards={cards}
            banks={banks}
            onSubmit={(data) => {
              // Create expense data without undefined values
              const baseData = {
                description: data.description,
                amount: data.amount,
                category: data.category,
                frequency: data.frequency,
                startDate: data.startDate,
                dayOfWeek: data.dayOfWeek,
                dayOfMonth: data.dayOfMonth,
                isActive: data.isActive,
              };
              
              // Only add optional fields if they have values
              const expenseData: Omit<RecurringExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastGenerated'> & { endDate?: string } = {
                ...baseData,
                ...(data.endDate ? { endDate: data.endDate } : {}),
                ...(data.paymentMethod ? { paymentMethod: data.paymentMethod } : {}),
                ...(data.paymentMethod === 'credit_card' && data.cardId ? { cardId: data.cardId } : {}),
                ...(data.paymentMethod === 'e_wallet' && data.paymentMethodName ? { paymentMethodName: data.paymentMethodName } : {}),
              };

              onAdd(expenseData);
              setIsAdding(false);
            }}
            onCancel={() => {
              setIsAdding(false);
              setEditingId(null);
            }}
          />
        </div>
      )}

      {/* Upcoming Due Payments Section */}
      {dueBills.length > 0 && (
        <div style={styles.dueBillsContainer}>
          <div 
            style={styles.dueBillsHeader}
            onClick={handleToggleDueBills}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px' }}>🔔</span>
              <h3 style={styles.dueBillsTitle}>{t('upcomingDuePayments')}</h3>
              {unviewedBills.length > 0 && (
                <span style={styles.badge}>{unviewedBills.length}</span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', transform: showDueBills ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
          </div>
          
          {showDueBills && (
            <div style={styles.dueBillsList}>
              {dueBills.map((bill) => (
                <div key={bill.id} style={styles.dueBillCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    {/* Payment Method Icon */}
                    {bill.paymentMethod === 'credit_card' && (
                      <span style={{ fontSize: '16px' }}>💳</span>
                    )}
                    {bill.paymentMethod === 'e_wallet' && (
                      <span style={{ fontSize: '16px' }}>📱</span>
                    )}
                    {(!bill.paymentMethod || bill.paymentMethod === 'cash') && (
                      <span style={{ fontSize: '16px' }}>💵</span>
                    )}
                    
                    {/* Category Badge */}
                    <span 
                      style={{
                        ...styles.category,
                        ...getCategoryColor(bill.category)
                      }}
                    >
                      {bill.category}
                    </span>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={styles.dueBillAmount}>${bill.amount.toFixed(2)}</div>
                  </div>
                  
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={styles.dueBillDescription}>{bill.description}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {t('dueToday')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <SearchBar
          placeholder={t('searchByName') || 'Search by name...'}
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

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
        onSelectAll={() => selectAll(filteredRecurringExpenses)}
        onDeleteSelected={() => {
          if (selectedIds.size > 0) {
             setDeleteConfirm({ isOpen: true, recurringId: null });
          }
        }}
      />

      <div style={styles.expenseList}>
        {filteredRecurringExpenses.length === 0 ? (
          <div style={styles.noData}>
            <p>{recurringExpenses.length === 0 ? t('noRecurringYet') : t('noResults') || 'No results found'}</p>
          </div>
        ) : (
          filteredRecurringExpenses.map((expense) => (
            <div key={expense.id} className={`recurring-card ${isSelectionMode && selectedIds.has(expense.id!) ? 'selected' : ''}`} style={openMenuId === expense.id ? { zIndex: 9999 } : undefined}>
              {isSelectionMode && (
                  <div className="selection-checkbox-wrapper" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                      <input
                          type="checkbox"
                          checked={selectedIds.has(expense.id!)}
                          onChange={() => toggleSelection(expense.id!)}
                          className="multi-select-checkbox"
                          onClick={(e) => e.stopPropagation()}
                      />
                  </div>
              )}
              {editingId === expense.id ? (
                <RecurringForm
                  initialData={{
                    description: expense.description,
                    amount: expense.amount,
                    category: expense.category,
                    frequency: expense.frequency,
                    startDate: expense.startDate,
                    endDate: expense.endDate || '',
                    dayOfWeek: expense.dayOfWeek || 1,
                    dayOfMonth: expense.dayOfMonth || 1,
                    isActive: expense.isActive,
                    paymentMethod: expense.paymentMethod || 'cash',
                    cardId: expense.cardId || '',
                    paymentMethodName: expense.paymentMethodName || '',
                    bankId: expense.bankId || '',
                  }}
                  categories={categories}
                  cards={cards}
                  banks={banks}
                  onSubmit={(data) => {
                    const updates: Partial<RecurringExpense> = {};
                    if (expense.description !== data.description) updates.description = data.description;
                    if (expense.amount !== data.amount) updates.amount = data.amount;
                    if (expense.category !== data.category) updates.category = data.category;
                    if (expense.frequency !== data.frequency) updates.frequency = data.frequency;
                    if (expense.startDate !== data.startDate) updates.startDate = data.startDate;
                    if ((expense.endDate || '') !== data.endDate) updates.endDate = data.endDate || undefined;
                    if (expense.dayOfWeek !== data.dayOfWeek) updates.dayOfWeek = data.dayOfWeek;
                    if (expense.dayOfMonth !== data.dayOfMonth) updates.dayOfMonth = data.dayOfMonth;
                    if (expense.isActive !== data.isActive) updates.isActive = data.isActive;
                    if ((expense.paymentMethod || 'cash') !== data.paymentMethod) updates.paymentMethod = data.paymentMethod;
                    if ((expense.cardId || '') !== data.cardId) updates.cardId = data.cardId || undefined;
                    if ((expense.paymentMethodName || '') !== data.paymentMethodName) updates.paymentMethodName = data.paymentMethodName || undefined;

                    if (Object.keys(updates).length > 0) {
                      onUpdate(expense.id!, updates);
                    }
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                  isEditing={true}
                />
              ) : (
                // View Mode
                <>
                  {/* First row: Payment Icon, Category, Status, Amount */}
                  <div style={styles.expenseRow1}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Payment Method Icon */}
                      {expense.paymentMethod === 'credit_card' && (
                        <span style={{ fontSize: '16px' }}>💳</span>
                      )}
                      {expense.paymentMethod === 'e_wallet' && (
                        <span style={{ fontSize: '16px' }}>📱</span>
                      )}
                      {(!expense.paymentMethod || expense.paymentMethod === 'cash') && (
                        <span style={{ fontSize: '16px' }}>💵</span>
                      )}
                      {/* Category */}
                      <span 
                        className="category-chip"
                        style={{
                          ...styles.category,
                          ...getCategoryColor(expense.category)
                        }}
                      >
                        {expense.category}
                      </span>
                      {/* Active/Inactive Status */}
                      {expense.isActive ? (
                        <span style={styles.activeStatus}>● {t('active')}</span>
                      ) : (
                        <span style={styles.inactiveStatus}>● {t('inactive')}</span>
                      )}
                    </div>
                    <div style={styles.amount}>${expense.amount.toFixed(2)}</div>
                  </div>

                  {/* Second row: Description */}
                  <div style={styles.expenseRow2}>
                    <h4 style={styles.description}>{expense.description}</h4>
                  </div>

                  {/* Third row: Payment Details, Frequency, and Hamburger */}
                  <div style={styles.expenseRow3}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>
                      {expense.paymentMethod === 'credit_card' && (
                        <span>💳 {cards.find(c => c.id === expense.cardId)?.name || t('creditCard')}</span>
                      )}
                      {expense.paymentMethod === 'e_wallet' && (
                        <span>📱 {expense.paymentMethodName || t('eWallet')}</span>
                      )}
                      {(!expense.paymentMethod || expense.paymentMethod === 'cash') && (
                        <span>💵 {t('cash')}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {({ daily: t('freqDaily'), weekly: t('freqWeekly'), monthly: t('freqMonthly'), yearly: t('freqYearly') } as Record<string,string>)[expense.frequency]}
                    </div>

                    {/* Desktop: Show individual buttons */}
                    <div className="desktop-actions" style={{ gap: '8px' }}>
                      <button
                        onClick={() => onToggleActive(expense.id!, !expense.isActive)}
                        className={`btn-icon ${expense.isActive ? 'btn-icon-warning' : 'btn-icon-success'}`}
                        title={expense.isActive ? t('pause') : t('resume')}
                      >
                        {expense.isActive ? '⏸' : '▶'}
                      </button>
                      <button onClick={() => startInlineEdit(expense)} className="btn-icon btn-icon-primary" title={t('edit')}>
                        <EditIcon size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, recurringId: expense.id! })}
                        className="btn-icon btn-icon-danger"
                        title={t('delete')}
                      >
                        <DeleteIcon size={18} />
                      </button>
                    </div>

                    {/* Mobile: Show hamburger menu */}
                    <div className="mobile-actions">
                      <div style={styles.menuContainer}>
                        <button
                          className="menu-trigger-button"
                          onClick={() => setOpenMenuId(openMenuId === expense.id ? null : expense.id!)}
                          aria-label="More"
                        >
                          ⋮
                        </button>
                        {openMenuId === expense.id && (
                          <div style={styles.menu}>
                            <button
                              className="menu-item-hover"
                              style={styles.menuItem}
                              onClick={() => {
                                setOpenMenuId(null);
                                onToggleActive(expense.id!, !expense.isActive);
                              }}
                            >
                              <span style={styles.menuIcon}>{expense.isActive ? '⏸' : '▶'}</span>
                              {expense.isActive ? t('pause') : t('resume')}
                            </button>
                            <button
                              className="menu-item-hover"
                              style={styles.menuItem}
                              onClick={() => {
                                setOpenMenuId(null);
                                startInlineEdit(expense);
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
                                setDeleteConfirm({ isOpen: true, recurringId: expense.id! });
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
                  </>
                )}
            </div>
          ))
        )}
      </div>
      
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('deleteRecurringExpense')}
        message={deleteConfirm.recurringId ? t('confirmDeleteRecurring') : t('confirmDeleteSelected')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.recurringId) {
            onDelete(deleteConfirm.recurringId);
          } else if (isSelectionMode) {
             selectedIds.forEach(id => onDelete(id));
             clearSelection();
             setIsSelectionMode(false);
          }
          setDeleteConfirm({ isOpen: false, recurringId: null });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, recurringId: null })}
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  searchContainer: {
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
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
    maxHeight: '70vh',
    overflowY: 'auto' as const,
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
  expenseList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  expenseRow1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  expenseRow2: {
    display: 'flex',
    alignItems: 'center',
  },
  expenseRow3: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  description: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
  },
  category: {
    padding: '5px 10px',
    background: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600' as const,
    boxShadow: '0 1px 3px var(--shadow)',
  },
  amount: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: 'var(--error-text)',
    whiteSpace: 'nowrap' as const,
  },
  status: {
    fontSize: '12px',
  },
  activeStatus: {
    color: 'var(--success-text)',
    fontSize: '11px',
    fontWeight: '500' as const,
  },
  inactiveStatus: {
    color: 'var(--error-text)',
    fontSize: '11px',
    fontWeight: '500' as const,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  menuContainer: {
    position: 'relative' as const,
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
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  // Due Bills Section Styles
  dueBillsContainer: {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  dueBillsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  dueBillsTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  badge: {
    backgroundColor: '#ef4444',
    color: 'white',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '600' as const,
    minWidth: '20px',
    textAlign: 'center' as const,
  },
  dueBillsList: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  dueBillCard: {
    backgroundColor: 'var(--bg-secondary)',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '8px',
    alignItems: 'center',
  },
  dueBillDescription: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
  },
  dueBillAmount: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: 'var(--error-text)',
  },
};

export default RecurringExpenseManager;
