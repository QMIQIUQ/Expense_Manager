import React, { useState, useEffect, useRef } from 'react';
import { Category, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { formatDateWithUserFormat } from '../../utils/dateUtils';
import { PlusIcon, EditIcon, DeleteIcon } from '../icons';
import CategoryForm from './CategoryForm';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';
import PopupModal from '../common/PopupModal';
import { sortCategories } from '../../utils/categoryOrder';
import { useTouchReorder } from '../../hooks/useTouchReorder';
import DisplayCurrencyAmount from '../common/DisplayCurrencyAmount';

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
  onReorder: (orderedIds: string[]) => Promise<void>;
  categoryCreationRequest?: {
    id: number;
    initialData: { name: string; icon: string; color: string };
  } | null;
  onCategoryCreationRequestHandled?: (requestId: number) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onDeleteExpense?: (id: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  expenses,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  categoryCreationRequest,
  onCategoryCreationRequestHandled,
  onUpdateExpense,
  onDeleteExpense,
}) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const [isAdding, setIsAdding] = useState(() => Boolean(categoryCreationRequest));
  const [addingCategoryInitialData, setAddingCategoryInitialData] = useState<{ name: string; icon: string; color: string } | undefined>(
    () => categoryCreationRequest?.initialData,
  );
  const [addCategoryFormKey, setAddCategoryFormKey] = useState(0);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSorting, setIsSorting] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const handledCategoryCreationRequestIds = useRef(new Set<number>());

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

  useEffect(() => {
    if (!categoryCreationRequest || handledCategoryCreationRequestIds.current.has(categoryCreationRequest.id)) return;

    handledCategoryCreationRequestIds.current.add(categoryCreationRequest.id);
    setAddingCategoryInitialData(categoryCreationRequest.initialData);
    setAddCategoryFormKey((key) => key + 1);
    setEditingCategory(null);
    setIsAdding(true);
    onCategoryCreationRequestHandled?.(categoryCreationRequest.id);
  }, [categoryCreationRequest, onCategoryCreationRequestHandled]);

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
  
  const sortedCategories = sortCategories(categories);
  
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

  const reorderCategories = async (fromId: string, toId: string) => {
    if (isSavingOrder || fromId === toId) return;
    const fromIndex = sortedCategories.findIndex((category) => category.id === fromId);
    const toIndex = sortedCategories.findIndex((category) => category.id === toId);
    if (fromIndex < 0 || toIndex < 0 || sortedCategories.some((category) => !category.id)) return;

    const reordered = [...sortedCategories];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setOrderError(false);
    setIsSavingOrder(true);
    try {
      await onReorder(reordered.map((category) => category.id!));
    } catch {
      setOrderError(true);
    } finally {
      setIsSavingOrder(false);
    }
  };
  const touchReorder = useTouchReorder({
    listRef: categoryListRef,
    disabled: !isSorting || isSavingOrder,
    onReorder: (fromId, toId) => { void reorderCategories(fromId, toId); },
  });

  const startEdit = (category: Category) => {
    // Close the add form if it's open
    setIsAdding(false);
    setEditingCategory(category);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
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
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => {
              setIsSorting((value) => !value);
              setSearchTerm('');
              setOrderError(false);
            }}
            disabled={isSelectionMode || isSavingOrder}
            className={`btn ${isSorting ? 'btn-accent-light' : 'btn-secondary'}`}
            aria-pressed={isSorting}
          >
            ↕ {isSorting ? t('doneSortingCategories') : t('sortCategories')}
          </button>
          {!isSorting && <button onClick={() => {
            setAddingCategoryInitialData(undefined);
            setAddCategoryFormKey((key) => key + 1);
            setIsAdding(true);
            setEditingCategory(null);
          }} className="btn btn-accent-light">
            <PlusIcon size={18} />
            <span>{t('addCategory')}</span>
          </button>}
        </div>
      </div>

      {/* Add Category Popup Modal */}
      <PopupModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title={t('addCategory')}
        hideHeader={true}
        chromeless={true}
        hideFooter={true}
        maxWidth="500px"
      >
        <CategoryForm
          key={addCategoryFormKey}
          initialData={addingCategoryInitialData}
          onSubmit={(data) => {
            onAdd({ ...data, isDefault: false });
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      </PopupModal>

      {/* Search Bar */}
      {isSorting && <p style={styles.sortHint}>{t('reorderCategoriesHint')}{isSavingOrder ? ` · ${t('savingOrder')}` : ''}</p>}
      {orderError && <p role="alert" style={styles.orderError}>{t('saveOrderFailed')}</p>}
      {!isSorting && <div style={styles.searchContainer}>
        <SearchBar
          placeholder={t('searchByName') || 'Search by name...'}
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>}

      {!isSorting && <MultiSelectToolbar
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.size}
        onToggleSelectionMode={toggleSelectionMode}
        onSelectAll={() => selectAll(filteredCategories)}
        onDeleteSelected={() => {
          const ids = Array.from(selectedIds);
          if (ids.length === 0) return;
          setBulkDeleteConfirm(true);
        }}
        style={{ marginBottom: 'var(--ui-space-16px)' }}
      />}

      <div style={styles.categoryList} ref={categoryListRef}>
        {filteredCategories.length === 0 ? (
          <div style={styles.noData}>
            <p>{categories.length === 0 ? t('noCategories') || 'No categories yet' : t('noResults') || 'No results found'}</p>
          </div>
        ) : (
          filteredCategories.map((category, index) => {
            const isDuplicate = duplicateNames.has(category.name);
            return (
              <div 
                key={category.id} 
                className={`category-card ${isDuplicate ? 'warning-border' : ''}`} 
                data-touch-reorder-item={category.id}
                onDragOver={(event) => {
                  if (!isSorting || isSavingOrder || !draggedId) return;
                  event.preventDefault();
                  setDragOverId(category.id!);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (isSorting && draggedId && category.id) void reorderCategories(draggedId, category.id);
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                style={{
                  ...(openMenuId === category.id ? { zIndex: 9999 } : {}),
                  ...(isSorting && (dragOverId === category.id || touchReorder.overId === category.id) ? { outline: '2px solid var(--accent-primary)' } : {}),
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--ui-space-12px)',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--ui-radius-8px)',
                }}
              >
                {isSorting && (
                  <div style={styles.sortControls}>
                    <span
                      className="touch-drag-handle"
                      draggable={!isSavingOrder && !touchReorder.activeId}
                      onDragStart={(event) => {
                        if (touchReorder.isActive()) { event.preventDefault(); return; }
                        if (!category.id) return;
                        event.dataTransfer.effectAllowed = 'move';
                        setDraggedId(category.id);
                      }}
                      onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                      onPointerDown={touchReorder.onPointerDown(category.id!)}
                      onPointerMove={touchReorder.onPointerMove}
                      onPointerUp={touchReorder.onPointerUp}
                      onPointerCancel={touchReorder.onPointerCancel}
                      style={{ ...styles.dragHandle, ...(touchReorder.activeId === category.id ? { opacity: 0.5 } : {}) }}
                      aria-hidden="true"
                    >⋮⋮</span>
                    <div style={styles.moveButtons}>
                      <button type="button" className="btn-icon" style={styles.moveButton}
                        aria-label={`${t('moveCategoryUp')}: ${category.name}`}
                        disabled={index === 0 || isSavingOrder}
                        onClick={() => void reorderCategories(category.id!, filteredCategories[index - 1].id!)}>↑</button>
                      <button type="button" className="btn-icon" style={styles.moveButton}
                        aria-label={`${t('moveCategoryDown')}: ${category.name}`}
                        disabled={index === filteredCategories.length - 1 || isSavingOrder}
                        onClick={() => void reorderCategories(category.id!, filteredCategories[index + 1].id!)}>↓</button>
                    </div>
                  </div>
                )}
                {isSelectionMode && (
                  <div style={{ paddingRight: 'var(--ui-space-12px)', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(category.id!)}
                      onChange={() => toggleSelection(category.id!)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                )}
                {/* View Mode - removed inline edit */}
                <>
                  <div style={styles.categoryInfo}>
                    <span style={{ ...styles.categoryIcon, backgroundColor: category.color }}>
                      {category.icon}
                    </span>
                      <span style={styles.categoryName}>
                        {category.name}
                        {isDuplicate && <span style={{ color: 'var(--warning-text)', marginLeft: 'var(--ui-space-8px)', fontSize: 'var(--ui-font-12px)' }}>⚠️ Duplicate</span>}
                      </span>
                      {category.isDefault && <span style={styles.defaultBadge}>Default</span>}
                    </div>
                    
                    {/* Desktop: Show individual buttons */}
                    {!isSorting && <div className="desktop-actions" style={{ gap: 'var(--ui-space-8px)', alignItems: 'center' }}>
                      <button onClick={() => startEdit(category)} className="btn-icon btn-icon-primary" aria-label={t('edit')}>
                        <EditIcon size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(category)}
                        className="btn-icon btn-icon-danger"
                        aria-label={t('delete')}
                      >
                        <DeleteIcon size={18} />
                      </button>
                    </div>}

                    {/* Mobile: Show hamburger menu */}
                    {!isSorting && <div className="mobile-actions">
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
                                startEdit(category);
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
                    </div>}
                  </>
              </div>
            );
          }))}
      </div>

      {/* Edit Category Popup Modal */}
      <PopupModal
        isOpen={editingCategory !== null}
        onClose={cancelEdit}
        title={t('editCategory')}
        hideHeader={true}
        chromeless={true}
        hideFooter={true}
        maxWidth="500px"
      >
        {editingCategory && (
          <CategoryForm
            initialData={{
              name: editingCategory.name,
              icon: editingCategory.icon,
              color: editingCategory.color,
            }}
            isEditing={true}
            onSubmit={(data) => {
              onUpdate(editingCategory.id!, data);
              cancelEdit();
            }}
            onCancel={cancelEdit}
          />
        )}
      </PopupModal>
      
      {/* Enhanced Delete Confirmation Dialog using PopupModal */}
      <PopupModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => {
          setDeleteConfirm({ isOpen: false, categoryId: null, categoryName: '', expensesUsingCategory: [] });
          setDeleteAction(null);
          setReassignToCategoryId('');
        }}
        title={`${t('delete')} ${t('category')}`}
        primaryButtonLabel={t('delete')}
        secondaryButtonLabel={t('cancel')}
        primaryButtonVariant="danger"
        primaryButtonDisabled={deleteConfirm.expensesUsingCategory.length > 0 && (!deleteAction || (deleteAction === 'reassign' && !reassignToCategoryId))}
        onPrimaryAction={() => {
          if (deleteConfirm.expensesUsingCategory.length > 0) {
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
        maxWidth="600px"
      >
        {deleteConfirm.expensesUsingCategory.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-space-16px)' }}>
            <div style={styles.modalWarning}>
              ⚠️ {t('warning')}: {t('categoryInUse') || 'This category is being used by'} {deleteConfirm.expensesUsingCategory.length} {t('expenses') || 'expense(s)'}:
            </div>
            
            <div style={styles.expenseList}>
              {deleteConfirm.expensesUsingCategory.slice(0, 5).map(exp => (
                <div key={exp.id} style={styles.expenseItem}>
                  • {exp.description} (<DisplayCurrencyAmount amount={exp.amount} currency={exp.currency} date={exp.date} showSource /> - {formatDateWithUserFormat(exp.date, dateFormat)})
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
              <label className="ui-form-label" style={styles.radioLabel}>
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
                          className="ui-control--standard"
                          style={{ marginLeft: 'var(--ui-space-28px)', width: 'calc(100% - 28px)' }}
                >
                  <option value="">{t('selectCategory') || 'Select a category...'}</option>
                  {sortedCategories
                    .filter(cat => cat.id !== deleteConfirm.categoryId)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                </select>
              )}
              
              <label className="ui-form-label" style={styles.radioLabel}>
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
          </div>
        ) : (
          <div style={styles.modalMessage}>
            {t('confirmDelete') || 'Are you sure you want to delete this category?'}
          </div>
        )}
      </PopupModal>

      {/* Bulk Delete Confirmation Modal using PopupModal */}
      <PopupModal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        title={t('deleteSelected')}
        primaryButtonLabel={t('delete')}
        secondaryButtonLabel={t('cancel')}
        primaryButtonVariant="danger"
        onPrimaryAction={() => {
          const ids = Array.from(selectedIds);
          ids.forEach(id => onDelete(id));
          clearSelection();
          setIsSelectionMode(false);
          setBulkDeleteConfirm(false);
        }}
        maxWidth="480px"
      >
        <div style={styles.modalMessage}>
          {t('confirmBulkDelete').replace('{count}', selectedIds.size.toString())}
        </div>
      </PopupModal>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-12px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--ui-space-12px)',
    flexWrap: 'wrap' as const,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-8px)',
    flexWrap: 'wrap' as const,
  },
  sortHint: {
    margin: 'var(--ui-space-0px)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--ui-font-14px)',
  },
  orderError: {
    margin: 'var(--ui-space-0px)',
    padding: 'var(--ui-space-10px) var(--ui-space-12px)',
    borderRadius: 'var(--ui-radius-8px)',
    color: 'var(--error-text)',
    backgroundColor: 'var(--error-bg)',
    fontSize: 'var(--ui-font-14px)',
  },
  sortControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-6px)',
    marginRight: 'var(--ui-space-10px)',
    flexShrink: 0,
  },
  dragHandle: {
    color: 'var(--text-secondary)',
    cursor: 'grab',
    padding: 'var(--ui-space-4px)',
    fontSize: 'var(--ui-font-20px)',
    userSelect: 'none' as const,
  },
  moveButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-2px)',
  },
  moveButton: {
    padding: 'var(--ui-space-0px) var(--ui-space-5px)',
    minWidth: '32px',
    minHeight: '32px',
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  title: {
    margin: 'var(--ui-space-0px)',
    fontSize: 'var(--ui-font-24px)',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  searchContainer: {
    display: 'flex',
    gap: 'var(--ui-space-10px)',
  },
  searchInput: {
    flex: 1,
    padding: 'var(--ui-space-10px)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-6px)',
    fontSize: 'var(--ui-font-14px)',
  },
  noData: {
    textAlign: 'center' as const,
    padding: 'var(--ui-space-40px)',
    color: 'var(--text-secondary)',
  },
  form: {
    backgroundColor: 'var(--bg-secondary)',
    padding: 'var(--ui-space-20px)',
    borderRadius: 'var(--ui-radius-8px)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-15px)',
    marginBottom: 'var(--ui-space-12px)',
    border: '1px solid var(--border-color)',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-8px)',
    minWidth: 0,
  },
  formRow: {
    display: 'flex',
    gap: 'var(--ui-space-15px)',
    alignItems: 'flex-start',
  },
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 'var(--ui-space-8px)',
    padding: 'var(--ui-space-4px)',
    maxWidth: '100%',
  },
  iconButton: {
    padding: 'var(--ui-space-10px)',
    fontSize: 'var(--ui-font-24px)',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
    borderRadius: 'var(--ui-radius-4px)',
    backgroundColor: 'var(--card-bg)',
    cursor: 'pointer',
  },
  iconButtonActive: {
    border: '2px solid var(--accent-primary)',
    backgroundColor: 'var(--accent-light)',
  },
  colorInput: {
    width: '100%',
    height: '40px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-4px)',
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    gap: 'var(--ui-space-12px)',
    marginTop: 'var(--ui-space-8px)',
  },
  submitButton: {
    flex: 1,
    padding: 'var(--ui-space-10px)',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--ui-radius-4px)',
    fontSize: 'var(--ui-font-14px)',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: 'var(--ui-space-10px) var(--ui-space-24px)',
    backgroundColor: 'var(--secondary-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-14px)',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-8px)',
  },
  categoryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-12px)',
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
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-20px)',
    flexShrink: 0,
  },
  categoryName: {
    fontSize: 'var(--ui-font-16px)',
    fontWeight: '500' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  defaultBadge: {
    padding: 'var(--ui-space-4px) var(--ui-space-8px)',
    backgroundColor: 'var(--info-bg)',
    color: 'var(--info-text)',
    borderRadius: 'var(--ui-radius-4px)',
    fontSize: 'var(--ui-font-12px)',
    fontWeight: '500' as const,
  },
  categoryActions: {
    display: 'flex',
    gap: 'var(--ui-space-8px)',
    alignItems: 'center',
  },
  editBtn: {
    padding: 'var(--ui-space-8px)',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: 'var(--ui-radius-8px)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: 'var(--ui-space-8px)',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    border: 'none',
    borderRadius: 'var(--ui-radius-8px)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContainer: {
    position: 'relative' as const,
  },
  menuButton: {
    padding: 'var(--ui-space-8px) var(--ui-space-12px)',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: 'var(--ui-radius-8px)',
    cursor: 'pointer',
    fontSize: 'var(--ui-font-20px)',
    fontWeight: 'bold' as const,
    lineHeight: '1',
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: 'var(--ui-space-4px)',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-8px)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 9999,
    minWidth: '160px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-8px)',
    width: '100%',
    padding: 'var(--ui-space-12px) var(--ui-space-16px)',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 'var(--ui-font-14px)',
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
    borderRadius: 'var(--ui-radius-16px)',
    padding: 'var(--ui-space-28px)',
    maxWidth: '600px',
    width: '90%',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    border: '1px solid var(--border-color)',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    margin: 'var(--ui-space-0px) var(--ui-space-0px) var(--ui-space-16px) var(--ui-space-0px)',
    fontSize: 'var(--ui-font-22px)',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  modalWarning: {
    padding: 'var(--ui-space-12px)',
    backgroundColor: 'var(--warning-bg)',
    border: '1px solid var(--warning-text)',
    borderRadius: 'var(--ui-radius-4px)',
    marginBottom: 'var(--ui-space-16px)',
    color: 'var(--warning-text)',
    fontSize: 'var(--ui-font-14px)',
  },
  expenseList: {
    marginBottom: 'var(--ui-space-16px)',
    padding: 'var(--ui-space-12px)',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--ui-radius-4px)',
    maxHeight: '200px',
    overflow: 'auto',
  },
  expenseItem: {
    padding: 'var(--ui-space-4px) var(--ui-space-0px)',
    fontSize: 'var(--ui-font-14px)',
    color: 'var(--text-secondary)',
  },
  modalQuestion: {
    marginBottom: 'var(--ui-space-16px)',
    fontSize: 'var(--ui-font-16px)',
    fontWeight: '500' as const,
    color: 'var(--text-primary)',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--ui-space-12px)',
    marginBottom: 'var(--ui-space-24px)',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-8px)',
    fontSize: 'var(--ui-font-14px)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  radio: {
    cursor: 'pointer',
  },
  modalMessage: {
    marginBottom: 'var(--ui-space-24px)',
    fontSize: 'var(--ui-font-14px)',
    color: 'var(--text-secondary)',
  },
  modalActions: {
    display: 'flex',
    gap: 'var(--ui-space-12px)',
    justifyContent: 'flex-end',
  },
  confirmButton: {
    padding: 'var(--ui-space-10px) var(--ui-space-24px)',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    border: 'none',
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-14px)',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default CategoryManager;
