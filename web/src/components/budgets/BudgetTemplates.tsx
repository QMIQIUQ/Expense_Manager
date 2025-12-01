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

interface BudgetTemplatesProps {
  categories: Category[];
  onApplyTemplate: (budgets: Array<{ categoryName: string; categoryId: string; amount: number; alertThreshold: number }>) => void;
  onClose: () => void;
}

const BudgetTemplates: React.FC<BudgetTemplatesProps> = ({
  categories,
  onApplyTemplate,
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
            <label style={styles.inputLabel}>
              {t('totalMonthlyBudget') || 'Total Monthly Budget'} ($)
            </label>
            <input
              type="number"
              value={totalBudget}
              onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)}
              min="100"
              step="100"
              style={styles.budgetInput}
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
              {previewBudgets.map((budget, index) => {
                const hasCategory = categories.some(
                  (c) => c.name.toLowerCase() === budget.categoryName.toLowerCase()
                );
                return (
                  <div
                    key={index}
                    style={{
                      ...styles.previewItem,
                      opacity: hasCategory ? 1 : 0.5,
                    }}
                  >
                    <span style={styles.previewCategory}>
                      {budget.categoryName}
                      {!hasCategory && (
                        <span style={styles.missingBadge}>
                          {t('categoryMissing') || 'Missing'}
                        </span>
                      )}
                    </span>
                    <span style={styles.previewAmount}>${budget.amount.toFixed(0)}</span>
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
    padding: '20px',
  },
  modal: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    padding: '24px',
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
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  description: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    marginBottom: '20px',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  templateCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 12px',
    backgroundColor: 'var(--bg-secondary)',
    border: '2px solid var(--border-color)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  templateCardSelected: {
    borderColor: 'var(--accent-primary)',
    backgroundColor: 'var(--accent-light)',
  },
  templateIcon: {
    fontSize: '28px',
  },
  templateName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'center',
  },
  templateDesc: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
  },
  budgetInputSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  inputLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  budgetInput: {
    padding: '8px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    width: '120px',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
  },
  previewButton: {
    padding: '8px 16px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  previewSection: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  previewTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  previewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  previewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '8px',
  },
  previewCategory: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  previewAmount: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
  },
  missingBadge: {
    fontSize: '10px',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  previewNote: {
    marginTop: '12px',
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '16px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  applyButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default BudgetTemplates;
