import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BaseForm } from '../common/BaseForm';

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
}

interface CategoryFormProps {
  initialData?: CategoryFormData;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const commonIcons = ['🍔', '🚗', '🛍️', '🎬', '📄', '🏥', '📚', '💰', '🏠', '✈️', '💳', '📦'];

const CategoryForm: React.FC<CategoryFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = React.useState<CategoryFormData>(
    initialData || {
      name: '',
      icon: '📦',
      color: '#95A5A6',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <BaseForm
      title={isEditing ? t('editCategory') : t('addCategory')}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="categoryName" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('categoryName')}
            </label>
            <input
              id="categoryName"
              type="text"
              value={formData.name}
              placeholder={t('categoryNamePlaceholder')}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
              }}
            />
          </div>
          <div className="w-[60px]">
            <label htmlFor="categoryColor" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('categoryColor')}
            </label>
            <input
              id="categoryColor"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-[46px] rounded-lg cursor-pointer border border-gray-200"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)'
              }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="categoryIconGroup" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            {t('categoryIcon')}
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2" id="categoryIconGroup">
            {commonIcons.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setFormData({ ...formData, icon })}
                className={`p-3 text-xl rounded-lg border-2 transition-all ${
                  formData.icon === icon 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{
                  backgroundColor: formData.icon === icon ? 'var(--accent-light)' : 'var(--card-bg)',
                  borderColor: formData.icon === icon ? 'var(--accent-primary)' : 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BaseForm>
  );
};

export default CategoryForm;