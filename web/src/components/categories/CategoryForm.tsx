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
  const [errors, setErrors] = React.useState<{ name?: string }>({});
  const [formData, setFormData] = React.useState<CategoryFormData>(
    initialData || {
      name: '',
      icon: '📦',
      color: '#95A5A6',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { name?: string } = {};
    if (!formData.name.trim()) {
      nextErrors.name = t('pleaseFillField') || 'Please fill this field';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(formData);
  };

  return (
    <BaseForm
      title={isEditing ? t('editCategory') : t('addCategory')}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={isEditing ? (t('update') || 'Update') : (t('add') || 'Add')}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="categoryName" className="ui-form-label ui-form-label--field">
              {t('categoryName')}
            </label>
            <input
              id="categoryName"
              type="text"
              value={formData.name}
              placeholder={t('categoryNamePlaceholder')}
              onChange={(e) => {
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                setFormData({ ...formData, name: e.target.value });
              }}
              required
              aria-invalid={Boolean(errors.name)}
              className="ui-control--standard ui-control--full-width"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
              }}
            />
            {errors.name && (
              <div className="ui-field-error" style={{ marginTop: 'var(--ui-space-1)' }}>
                {errors.name}
              </div>
            )}
          </div>
          <div className="w-[60px]">
            <label htmlFor="categoryColor" className="ui-form-label ui-form-label--field">
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
            <div className="ui-form-label ui-form-label--field">
              {t('categoryIcon')}
            </div>

          <input
            aria-label={t('categoryIcon') || 'Icon'}
            type="text"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            className="ui-control--standard ui-control--full-width"
            style={{
              marginBottom: 'var(--ui-space-3)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          />

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2" id="categoryIconGroup">
            {commonIcons.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setFormData({ ...formData, icon })}
                aria-label={`${t('select') || 'Select'} ${icon}`}
                aria-pressed={formData.icon === icon}
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
