import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface MultiSelectToolbarProps {
  isSelectionMode: boolean;
  selectedCount: number;
  onToggleSelectionMode: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const MultiSelectToolbar: React.FC<MultiSelectToolbarProps> = ({
  isSelectionMode,
  selectedCount,
  onToggleSelectionMode,
  onSelectAll,
  onDeleteSelected,
  className = '',
  style,
}) => {
  const { t } = useLanguage();

  return (
    <div 
      className={className} 
      style={{ 
        display: 'flex', 
        justifyContent: 'flex-start', 
        gap: '8px', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        ...style 
      }}
    >
      <button
        onClick={onToggleSelectionMode}
        className="btn btn-secondary"
        aria-pressed={isSelectionMode}
        aria-label="Toggle multi-select"
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          backgroundColor: isSelectionMode ? 'var(--accent-light)' : 'var(--card-bg)',
          color: isSelectionMode ? 'var(--accent-primary)' : 'var(--text-primary)',
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        {isSelectionMode ? t('cancel') : t('multiSelect') || 'Multi-select'}
      </button>
      {isSelectionMode && (
        <>
          <button
            onClick={onSelectAll}
            className="btn btn-success"
            aria-label="Select all"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--success-text)',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success-text)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✓ {t('selectAll') || 'Select All'}
          </button>
          <button
            onClick={onDeleteSelected}
            className="btn btn-danger"
            aria-label="Delete selected"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--error-bg)',
              color: 'var(--error-text)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🗑 {t('deleteSelected') || 'Delete Selected'} {selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
        </>
      )}
    </div>
  );
};
