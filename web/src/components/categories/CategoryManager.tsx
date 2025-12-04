import React, { useState, useEffect } from 'react';
import { Category, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { formatDateWithUserFormat } from '../../utils/dateUtils';
import { PlusIcon, EditIcon, DeleteIcon } from '../icons';
import CategoryForm from './CategoryForm';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';

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

interface CategoryManagerProps {
  categories: Category[];
  expenses: Expense[];
  onAdd: (category: Omit<Category, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onDeleteExpense?: (id: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  expenses,
  onAdd,
  onUpdate,
  onDelete,
  onUpdateExpense,
  onDeleteExpense,
}) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const [deleteConfirm, setDeleteConfirm] = useState<{ 
    isOpen: boolean; 
    categoryId: string | null;
    categoryName: string;
    expensesUsingCategory: Expense[];
  }>({
    isOpen: false,
    categoryId: null,
    categoryName: '',
    expensesUsingCategory: [],
  });
  
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'reassign' | 'deleteExpenses' | null>(null);
  const [reassignToCategoryId, setReassignToCategoryId] = useState<string>('');

  // Detect duplicate category names
  const getDuplicateCategoryNames = () => {
    const nameCount: { [name: string]: number } = {};
    categories.forEach(cat => {
      nameCount[cat.name] = (nameCount[cat.name] || 0) + 1;
    });
    return new Set(Object.keys(nameCount).filter(name => nameCount[name] > 1));
  };

  const duplicateNames = getDuplicateCategoryNames();
  
  // Sort categories by name
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  
  // Filter categories by search term
  const filteredCategories = sortedCategories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    isSelectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    setIsSelectionMode
  } = useMultiSelect<Category>();

  const startInlineEdit = (category: Category) => {
    // Close the add form if it's open
    setIsAdding(false);
    setEditingId(category.id!);
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
  };



  // Get expenses that use a specific category
  const getExpensesUsingCategory = (categoryName: string): Expense[] => {
    return expenses.filter(expense => expense.category === categoryName);
  };

  // Handle delete button click
  const handleDeleteClick = (category: Category) => {
    const expensesUsingCategory = getExpensesUsingCategory(category.name);
    setDeleteConfirm({
      isOpen: true,
      categoryId: category.id!,
      categoryName: category.name,
      expensesUsingCategory,
    });
  };

  return (
    <div style={styles.container}>
      <style>{responsiveStyles}</style>
      <div style={styles.header}>
        <h2 style={styles.title}>{t('categories')}</h2>
        {!isAdding && (
          <button onClick={() => {
            setIsAdding(true);
            // Cancel any inline editing when opening add form
            setEditingId(null);
          }} className="btn btn-accent-light">
            <PlusIcon size={18} />
            <span>{t('addCategory')}</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-5">
          <CategoryForm
            onSubmit={(data) => {
              onAdd({ ...data, isDefault: false });
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
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
        onToggleSelectionMode={toggleSelectionMode}
        onSelectAll={() => selectAll(filteredCategories)}
        onDeleteSelected={() => {
          const ids = Array.from(selectedIds);
          if (ids.length === 0) return;
          setBulkDeleteConfirm(true);
        }}
        style={{ marginBottom: '16px' }}
      />

      <div style={styles.categoryList}>
        {filteredCategories.length === 0 ? (
          <div style={styles.noData}>
            <p>{categories.length === 0 ? t('noCategories') || 'No categories yet' : t('noResults') || 'No results found'}</p>
          </div>
        ) : (
          filteredCategories.map((category) => {
            const isDuplicate = duplicateNames.has(category.name);
            return (
              <div 
                key={category.id} 
                className={`category-card ${isDuplicate ? 'warning-border' : ''}`} 
                style={{
                  ...(openMenuId === category.id ? { zIndex: 9999 } : {}),
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
              >
                {isSelectionMode && !editingId && (
                  <div style={{ paddingRight: '12px', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(category.id!)}
                      onChange={() => toggleSelection(category.id!)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                )}
                {editingId === category.id ? (
                  // Inline Edit Mode
                  <div style={{ width: '100%' }}>
                    <CategoryForm
                      initialData={{
                        name: category.name,
                        icon: category.icon,
                        color: category.color,
                      }}
                      isEditing={true}
                      onSubmit={(data) => {
                        onUpdate(category.id!, data);
                        setEditingId(null);
                      }}
                      onCancel={cancelInlineEdit}
                    />
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div style={styles.categoryInfo}>
                      <span style={{ ...styles.categoryIcon, backgroundColor: category.color }}>
                        {category.icon}
                      </span>
                      <span style={styles.categoryName}>
                        {category.name}
                        {isDuplicate && <span style={{ color: 'var(--warning-text)', marginLeft: '8px', fontSize: '12px' }}>⚠️ Duplicate</span>}
                      </span>
                      {category.isDefault && <span style={styles.defaultBadge}>Default</span>}
                    </div>
                    
                    {/* Desktop: Show individual buttons */}
                    <div className="desktop-actions" style={{ gap: '8px', alignItems: 'center' }}>
                      <button onClick={() => startInlineEdit(category)} className="btn-icon btn-icon-primary" aria-label={t('edit')}>
                        <EditIcon size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(category)}
                        className="btn-icon btn-icon-danger"
                        aria-label={t('delete')}
                      >
                        <DeleteIcon size={18} />
                      </button>
                    </div>

                    {/* Mobile: Show hamburger menu */}
                    <div className="mobile-actions">
                      <div style={styles.menuContainer}>
                        <button
                          className="menu-trigger-button"
                          onClick={() => setOpenMenuId(openMenuId === category.id ? null : category.id!)}
                          aria-label="More"
                        >
                          ⋮
                        </button>
                        {openMenuId === category.id && (
                          <div style={styles.menu}>
                            <button
                              className="menu-item-hover"
                              style={styles.menuItem}
                              onClick={() => {
                                setOpenMenuId(null);
                                startInlineEdit(category);
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
                                handleDeleteClick(category);
                              }}
                            >
                              <span style={styles.menuIcon}><DeleteIcon size={16} /></span>
                              {t('delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          }))}
      </div>
      
      {/* Enhanced Delete Confirmation Dialog */}
      {deleteConfirm.isOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{t('delete')} {t('category')}</h3>
            
            {deleteConfirm.expensesUsingCategory.length > 0 ? (
              <>
                <div style={styles.modalWarning}>
                  ⚠️ {t('warning')}: {t('categoryInUse') || 'This category is being used by'} {deleteConfirm.expensesUsingCategory.length} {t('expenses') || 'expense(s)'}:
                </div>
                
                <div style={styles.expenseList}>
                  {deleteConfirm.expensesUsingCategory.slice(0, 5).map(exp => (
                    <div key={exp.id} style={styles.expenseItem}>
                      • {exp.description} (${exp.amount.toFixed(2)} - {formatDateWithUserFormat(exp.date, dateFormat)})
                    </div>
                  ))}
                  {deleteConfirm.expensesUsingCategory.length > 5 && (
                    <div style={styles.expenseItem}>...{t('and') || 'and'} {deleteConfirm.expensesUsingCategory.length - 5} {t('more') || 'more'}</div>
                  )}
                </div>
                
                <div style={styles.modalQuestion}>
                  {t('chooseDeletionAction') || 'What would you like to do with these expenses?'}
                </div>
                
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="deleteAction"
                      value="reassign"
                      checked={deleteAction === 'reassign'}
                      onChange={(e) => setDeleteAction(e.target.value as 'reassign')}
                      style={styles.radio}
                    />
                    <span>{t('reassignToCategory') || 'Reassign expenses to another category'}</span>
                  </label>
                  
                  {deleteAction === 'reassign' && (
                    <select
                      value={reassignToCategoryId}
                      onChange={(e) => setReassignToCategoryId(e.target.value)}
                      style={styles.reassignSelect}
                    >
                      <option value="">{t('selectCategory') || 'Select a category...'}</option>
                      {categories
                        .filter(cat => cat.id !== deleteConfirm.categoryId)
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                    </select>
                  )}
                  
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="deleteAction"
                      value="deleteExpenses"
                      checked={deleteAction === 'deleteExpenses'}
                      onChange={(e) => setDeleteAction(e.target.value as 'deleteExpenses')}
                      style={styles.radio}
                    />
                    <span style={{ color: 'var(--error-text)' }}>
                      {t('deleteExpensesToo') || 'Delete all expenses in this category'}
                    </span>
                  </label>
                </div>
                
                <div style={styles.modalActions}>
                  <button
                    onClick={() => {
                      if (!deleteAction) {
                        alert(t('pleaseSelectAction') || 'Please select an action');
                        return;
                      }
                      
                      if (deleteAction === 'reassign') {
                        if (!reassignToCategoryId) {
                          alert(t('pleaseSelectCategory') || 'Please select a category');
                          return;
                        }
                        
                        // Reassign all expenses to the selected category
                        if (onUpdateExpense) {
                          const targetCategory = categories.find(c => c.id === reassignToCategoryId);
                          if (targetCategory) {
                            deleteConfirm.expensesUsingCategory.forEach(exp => {
                              onUpdateExpense(exp.id!, { category: targetCategory.name });
                            });
                          }
                        }
                      } else if (deleteAction === 'deleteExpenses') {
                        // Delete all expenses
                        if (onDeleteExpense) {
                          deleteConfirm.expensesUsingCategory.forEach(exp => {
                            onDeleteExpense(exp.id!);
                          });
                        }
                      }
                      
                      // Delete the category
                      if (deleteConfirm.categoryId) {
                        onDelete(deleteConfirm.categoryId);
                      }
                      
                      // Reset state
                      setDeleteConfirm({ isOpen: false, categoryId: null, categoryName: '', expensesUsingCategory: [] });
                      setDeleteAction(null);
                      setReassignToCategoryId('');
                    }}
                    style={styles.confirmButton}
                    disabled={!deleteAction || (deleteAction === 'reassign' && !reassignToCategoryId)}
                  >
                    {t('delete')}
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm({ isOpen: false, categoryId: null, categoryName: '', expensesUsingCategory: [] });
                      setDeleteAction(null);
                      setReassignToCategoryId('');
                    }}
                    style={styles.cancelButton}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={styles.modalMessage}>
                  {t('confirmDelete') || 'Are you sure you want to delete this category?'}
                </div>
                <div style={styles.modalActions}>
                  <button
                    onClick={() => {
                      if (deleteConfirm.categoryId) {
                        onDelete(deleteConfirm.categoryId);
                      }
                      setDeleteConfirm({ isOpen: false, categoryId: null, categoryName: '', expensesUsingCategory: [] });
                    }}
                    style={styles.confirmButton}
                  >
                    {t('delete')}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: false, categoryId: null, categoryName: '', expensesUsingCategory: [] })}
                    style={styles.cancelButton}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{t('deleteSelected')}</h3>
            <div style={styles.modalMessage}>
              {t('confirmBulkDelete').replace('{count}', selectedIds.size.toString())}
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  ids.forEach(id => onDelete(id));
                  clearSelection();
                  setIsSelectionMode(false);
                  setBulkDeleteConfirm(false);
                }}
                style={styles.confirmButton}
              >
                {t('delete')}
              </button>
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                style={styles.cancelButton}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
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
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: 'var(--text-secondary)',
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
    gap: '8px',
    minWidth: 0,
  },
  formRow: {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-start',
  },
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    padding: '4px',
    maxWidth: '100%',
  },
  iconButton: {
    padding: '10px',
    fontSize: '24px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '4px',
    backgroundColor: 'var(--card-bg)',
    cursor: 'pointer',
  },
  iconButtonActive: {
    border: '2px solid #6366f1',
    backgroundColor: '#e0e7ff',
  },
  colorInput: {
    width: '100%',
    height: '40px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  submitButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 24px',
    backgroundColor: 'var(--secondary-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  categoryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  categoryIcon: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontSize: '20px',
    flexShrink: 0,
  },
  categoryName: {
    fontSize: '16px',
    fontWeight: '500' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  defaultBadge: {
    padding: '4px 8px',
    backgroundColor: 'var(--info-bg)',
    color: 'var(--info-text)',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
  },
  categoryActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  editBtn: {
    padding: '8px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
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
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    padding: '28px',
    maxWidth: '600px',
    width: '90%',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    border: '1px solid var(--border-color)',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: '22px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  modalWarning: {
    padding: '12px',
    backgroundColor: 'var(--warning-bg)',
    border: '1px solid var(--warning-text)',
    borderRadius: '4px',
    marginBottom: '16px',
    color: 'var(--warning-text)',
    fontSize: '14px',
  },
  expenseList: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '4px',
    maxHeight: '200px',
    overflow: 'auto',
  },
  expenseItem: {
    padding: '4px 0',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  modalQuestion: {
    marginBottom: '16px',
    fontSize: '16px',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '24px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  radio: {
    cursor: 'pointer',
  },
  reassignSelect: {
    marginLeft: '28px',
    padding: '8px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontSize: '14px',
    width: 'calc(100% - 28px)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
  },
  modalMessage: {
    marginBottom: '24px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  confirmButton: {
    padding: '10px 24px',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default CategoryManager;
