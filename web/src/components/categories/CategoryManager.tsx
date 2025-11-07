import React, { useState } from 'react';
import { Category } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../ConfirmModal';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (category: Omit<Category, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '📦',
    color: '#95A5A6',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; categoryId: string | null }>({
    isOpen: false,
    categoryId: null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(editingId, formData);
      setEditingId(null);
    } else {
      onAdd({ ...formData, isDefault: false });
      setIsAdding(false);
    }
    setFormData({ name: '', icon: '📦', color: '#95A5A6' });
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id!);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', icon: '📦', color: '#95A5A6' });
  };

  const commonIcons = ['🍔', '🚗', '🛍️', '🎬', '📄', '🏥', '📚', '💰', '🏠', '✈️', '💳', '📦'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{t('categories')}</h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} style={styles.addButton}>
            + {t('addCategory')}
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('categoryName')} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onFocus={(e) => e.target.select()}
              placeholder={t('categoryNamePlaceholder')}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>{t('categoryIcon')}</label>
              <div style={styles.iconGrid}>
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    style={{
                      ...styles.iconButton,
                      ...(formData.icon === icon ? styles.iconButtonActive : {}),
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>{t('categoryColor')}</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                style={styles.colorInput}
              />
            </div>
          </div>

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitButton}>
              {editingId ? t('editCategory') : t('addCategory')}
            </button>
            <button type="button" onClick={handleCancel} style={styles.cancelButton}>
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      <div style={styles.categoryList}>
        {categories.map((category) => (
          <div key={category.id} style={styles.categoryCard}>
            <div style={styles.categoryInfo}>
              <span style={{ ...styles.categoryIcon, backgroundColor: category.color }}>
                {category.icon}
              </span>
              <span style={styles.categoryName}>{category.name}</span>
              {category.isDefault && <span style={styles.defaultBadge}>Default</span>}
            </div>
            <div style={styles.categoryActions}>
              <button onClick={() => handleEdit(category)} style={styles.editBtn}>
                {t('edit')}
              </button>
              {!category.isDefault && (
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, categoryId: category.id! })}
                  style={styles.deleteBtn}
                >
                  {t('delete')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('delete') + ' ' + t('category')}
        message={t('confirmDelete')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.categoryId) {
            onDelete(deleteConfirm.categoryId);
          }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, categoryId: null })}
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
    fontSize: '20px',
    fontWeight: '600' as const,
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  form: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  formRow: {
    display: 'flex',
    gap: '15px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#333',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px',
  },
  iconButton: {
    padding: '10px',
    fontSize: '24px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  iconButtonActive: {
    borderColor: '#6366f1',
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
    gap: '10px',
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
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  categoryCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
  },
  categoryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  categoryIcon: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontSize: '20px',
  },
  categoryName: {
    fontSize: '16px',
    fontWeight: '500' as const,
  },
  defaultBadge: {
    padding: '4px 8px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500' as const,
  },
  categoryActions: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    padding: '8px 16px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default CategoryManager;
