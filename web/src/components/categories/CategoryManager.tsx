import React, { useState } from 'react';
import { Category } from '../../types';
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
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-xl font-semibold text-gray-900">Manage Categories</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors min-h-[44px]"
          >
            + Add Category
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onFocus={(e) => e.target.select()}
              placeholder="e.g., Pets, Gifts"
              required
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Icon Selector */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`p-2 sm:p-3 text-xl sm:text-2xl border rounded-md transition-all hover:scale-110 min-h-[44px] ${
                      formData.icon === icon
                        ? 'bg-indigo-100 border-indigo-500 shadow-sm'
                        : 'bg-white border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-12 sm:h-24 border border-gray-300 rounded-md cursor-pointer"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-5 py-2.5 bg-indigo-600 text-white rounded-md text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors min-h-[44px]"
            >
              {editingId ? 'Update' : 'Add'} Category
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 bg-gray-600 text-white rounded-md text-base font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Category List */}
      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            {/* Category Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span
                className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full text-xl sm:text-2xl flex-shrink-0"
                style={{ backgroundColor: category.color }}
              >
                {category.icon}
              </span>
              <span className="text-base font-medium text-gray-900 truncate">{category.name}</span>
              {category.isDefault && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded flex-shrink-0">
                  Default
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:flex-shrink-0">
              <button
                onClick={() => handleEdit(category)}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors min-h-[44px]"
              >
                Edit
              </button>
              {!category.isDefault && (
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, categoryId: category.id! })}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors min-h-[44px]"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
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

export default CategoryManager;
