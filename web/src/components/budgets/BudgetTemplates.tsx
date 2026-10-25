/**
 * BudgetTemplates - UI for selecting and applying budget templates
 * Phase 3.2 Implementation
 */

import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category } from '../../types';
import {
  BUILT_IN_TEMPLATES,
  calculateBudgetsFromTemplate,
  getTemplateTranslationKey,
  getTemplateDescriptionKey,
} from '../../utils/budgetTemplates';
import { sortCategoryEntries } from '../../utils/categoryOrder';
import { DEFAULT_BASE_CURRENCY, formatMoney, getCurrencySymbol } from '../../utils/currencyUtils';

interface BudgetTemplatesProps {
  categories: Category[];
  onApplyTemplate: (budgets: Array<{ categoryName: string; categoryId: string; amount: number; alertThreshold: number }>) => void;
  onCreateCategory: (categoryName: string) => void;
  onClose: () => void;
}

const BudgetTemplates: React.FC<BudgetTemplatesProps> = ({
  categories,
  onApplyTemplate,
  onCreateCategory,
  onClose,
}) => {
  const { t } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [totalBudget, setTotalBudget] = useState<number>(2000);
  const [showPreview, setShowPreview] = useState(false);

  const selectedTemplateData = BUILT_IN_TEMPLATES.find((t) => t.id === selectedTemplate);

  const handleApply = () => {
    if (!selectedTemplateData) return;

    const calculatedBudgets = calculateBudgetsFromTemplate(selectedTemplateData, totalBudget);
    
    // Map to existing categories
    const budgetsWithIds = calculatedBudgets
      .map((b) => {
        const category = categories.find(
          (c) => c.name.toLowerCase() === b.categoryName.toLowerCase()
        );
        if (category) {
          return {
            categoryName: category.name,
            categoryId: category.id!,
            amount: b.amount,
            alertThreshold: b.alertThreshold,
          };
        }
        return null;
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

    onApplyTemplate(budgetsWithIds);
  };

  const previewBudgets = selectedTemplateData
    ? calculateBudgetsFromTemplate(selectedTemplateData, totalBudget)
    : [];

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>📋 {t('budgetTemplates') || 'Budget Templates'}</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <p style={styles.description}>
          {t('templateDescription') || 'Choose a template to quickly set up your budgets'}
        </p>

        {/* Template Selection */}
        <div style={styles.templateGrid}>
          {BUILT_IN_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template.id);
                setTotalBudget(template.totalBudget || 2000);
                setShowPreview(false);
              }}
              style={{
                ...styles.templateCard,
                ...(selectedTemplate === template.id ? styles.templateCardSelected : {}),
              }}
            >
              <span style={styles.templateIcon}>{template.icon}</span>
              <span style={styles.templateName}>
                {t(getTemplateTranslationKey(template.id) as keyof typeof import('../../locales/translations').translations) || template.name}
              </span>
              <span style={styles.templateDesc}>
                {t(getTemplateDescriptionKey(template.id) as keyof typeof import('../../locales/translations').translations) || template.description}
              </span>
            </button>
          ))}
        </div>

        {/* Total Budget Input */}
        {selectedTemplate && (
          <div style={styles.budgetInputSection}>
            <label className="ui-form-label">
              {t('totalMonthlyBudget') || 'Total Monthly Budget'} ({getCurrencySymbol(DEFAULT_BASE_CURRENCY)})
            </label>
            <input
              type="number"
              value={totalBudget}
              onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)}
              min="100"
              step="100"
              className="ui-control--prominent"
              style={{ width: '120px' }}
            />
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={styles.previewButton}
            >
              {showPreview ? (t('hidePreview') || 'Hide Preview') : (t('showPreview') || 'Show Preview')}
            </button>
          </div>
        )}

        {/* Preview */}
        {showPreview && selectedTemplate && (
          <div style={styles.previewSection}>
            <h3 style={styles.previewTitle}>{t('budgetPreview') || 'Budget Preview'}</h3>
            <div style={styles.previewList}>
              {sortCategoryEntries(
                previewBudgets.map((budget): [string, typeof budget] => [
                  categories.find((category) => category.name.toLowerCase() === budget.categoryName.toLowerCase())?.name || budget.categoryName,
                  budget,
                ]),
                categories,
              ).map(([, budget], index) => {
                const hasCategory = categories.some(
                  (c) => c.name.toLowerCase() === budget.categoryName.toLowerCase()
                );
                return (
                  <div
                    key={index}
                    style={styles.previewItem}
                  >
                    <div style={styles.previewCategoryGroup}>
                      <span style={{ ...styles.previewCategory, opacity: hasCategory ? 1 : 0.5 }}>
                        {budget.categoryName}
                        {!hasCategory && (
                          <span style={styles.missingBadge}>
                            {t('categoryMissing') || 'Missing'}
                          </span>
                        )}
                      </span>
                      {!hasCategory && (
                        <button
                          type="button"
                          onClick={() => onCreateCategory(budget.categoryName)}
                          style={styles.createMissingCategoryButton}
                          aria-label={`${t('addCategory') || 'Add Category'}: ${budget.categoryName}`}
                        >
                          + {t('addCategory') || 'Add Category'}
                        </button>
                      )}
                    </div>
                    <span style={{ ...styles.previewAmount, opacity: hasCategory ? 1 : 0.5 }}>
                      {formatMoney(budget.amount, DEFAULT_BASE_CURRENCY)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p style={styles.previewNote}>
              {t('templateNote') || 'Only categories that exist in your account will be created.'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelButton}>
            {t('cancel')}
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedTemplate}
            style={{
              ...styles.applyButton,
              opacity: selectedTemplate ? 1 : 0.5,
            }}
          >
            {t('applyTemplate') || 'Apply Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 'var(--ui-space-20px)',
  },
  modal: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--ui-radius-16px)',
    padding: 'var(--ui-space-24px)',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--ui-space-12px)',
  },
  title: {
    margin: 'var(--ui-space-0px)',
    fontSize: 'var(--ui-font-20px)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--ui-font-24px)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 'var(--ui-space-4px) var(--ui-space-8px)',
  },
  description: {
    color: 'var(--text-secondary)',
    fontSize: 'var(--ui-font-14px)',
    marginBottom: 'var(--ui-space-20px)',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 'var(--ui-space-12px)',
    marginBottom: 'var(--ui-space-20px)',
  },
  templateCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--ui-space-8px)',
    padding: 'var(--ui-space-16px) var(--ui-space-12px)',
    backgroundColor: 'var(--bg-secondary)',
    border: '2px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-12px)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  templateCardSelected: {
    borderColor: 'var(--accent-primary)',
    backgroundColor: 'var(--accent-light)',
  },
  templateIcon: {
    fontSize: 'var(--ui-font-28px)',
  },
  templateName: {
    fontSize: 'var(--ui-font-14px)',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'center',
  },
  templateDesc: {
    fontSize: 'var(--ui-font-11px)',
    color: 'var(--text-secondary)',
    textAlign: 'center',
  },
  budgetInputSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-12px)',
    marginBottom: 'var(--ui-space-16px)',
    flexWrap: 'wrap',
  },
  previewButton: {
    padding: 'var(--ui-space-8px) var(--ui-space-16px)',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-13px)',
    fontWeight: 500,
    cursor: 'pointer',
  },
  previewSection: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--ui-radius-12px)',
    padding: 'var(--ui-space-16px)',
    marginBottom: 'var(--ui-space-16px)',
  },
  previewTitle: {
    margin: 'var(--ui-space-0px) var(--ui-space-0px) var(--ui-space-12px) var(--ui-space-0px)',
    fontSize: 'var(--ui-font-14px)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  previewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--ui-space-8px)',
  },
  previewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--ui-space-8px) var(--ui-space-12px)',
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--ui-radius-8px)',
  },
  previewCategory: {
    fontSize: 'var(--ui-font-13px)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-8px)',
  },
  previewCategoryGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--ui-space-10px)',
    minWidth: 0,
    flexWrap: 'wrap' as const,
  },
  previewAmount: {
    fontSize: 'var(--ui-font-14px)',
    fontWeight: 600,
    color: 'var(--accent-primary)',
  },
  missingBadge: {
    fontSize: 'var(--ui-font-10px)',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: 'var(--ui-space-2px) var(--ui-space-6px)',
    borderRadius: 'var(--ui-radius-4px)',
  },
  createMissingCategoryButton: {
    border: '1px solid var(--accent-primary)',
    borderRadius: 'var(--ui-radius-6px)',
    padding: 'var(--ui-space-5px) var(--ui-space-9px)',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    fontSize: 'var(--ui-font-12px)',
    fontWeight: 600,
    lineHeight: 1.4,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  previewNote: {
    marginTop: 'var(--ui-space-12px)',
    fontSize: 'var(--ui-font-11px)',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--ui-space-12px)',
    marginTop: 'var(--ui-space-16px)',
  },
  cancelButton: {
    padding: 'var(--ui-space-10px) var(--ui-space-20px)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-14px)',
    fontWeight: 500,
    cursor: 'pointer',
  },
  applyButton: {
    padding: 'var(--ui-space-10px) var(--ui-space-20px)',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--ui-radius-8px)',
    fontSize: 'var(--ui-font-14px)',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default BudgetTemplates;
