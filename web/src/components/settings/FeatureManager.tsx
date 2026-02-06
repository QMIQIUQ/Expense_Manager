import React, { useState, useEffect } from 'react';
import { FeatureTab, DEFAULT_FEATURES } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { TranslationKey } from '../../locales/translations';
import { DragIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';

interface FeatureManagerProps {
  enabledFeatures: FeatureTab[]; // Deprecated: for backward compatibility
  tabFeatures?: FeatureTab[];
  hamburgerFeatures?: FeatureTab[];
  onUpdate: (features: FeatureTab[], tabFeatures?: FeatureTab[], hamburgerFeatures?: FeatureTab[]) => Promise<void>;
  onReset: () => Promise<void>;
}

// Feature metadata for display
const FEATURE_METADATA: Record<FeatureTab, { icon: string; labelKey: TranslationKey; description: string }> = {
  dashboard: {
    icon: '📊',
    labelKey: 'dashboard' as TranslationKey,
    description: 'View expense summaries and analytics',
  },
  expenses: {
    icon: '💸',
    labelKey: 'expenses' as TranslationKey,
    description: 'Track and manage your expenses',
  },
  incomes: {
    icon: '💰',
    labelKey: 'incomes' as TranslationKey,
    description: 'Record and track income sources',
  },
  categories: {
    icon: '📁',
    labelKey: 'categories' as TranslationKey,
    description: 'Manage expense categories',
  },
  budgets: {
    icon: '🎯',
    labelKey: 'budgets' as TranslationKey,
    description: 'Set and track budget limits',
  },
  recurring: {
    icon: '🔄',
    labelKey: 'recurring' as TranslationKey,
    description: 'Manage recurring expenses',
  },
  paymentMethods: {
    icon: '💳',
    labelKey: 'paymentMethods' as TranslationKey,
    description: 'Manage payment methods (cards & e-wallets)',
  },
  settings: {
    icon: '⚙️',
    labelKey: 'featureSettings' as TranslationKey,
    description: 'Manage feature visibility',
  },
  profile: {
    icon: '👤',
    labelKey: 'profile' as TranslationKey,
    description: 'User profile and settings',
  },
  admin: {
    icon: '👑',
    labelKey: 'admin' as TranslationKey,
    description: 'Admin panel (for admins only)',
  },
};

const ALL_FEATURES: FeatureTab[] = [
  'dashboard',
  'expenses',
  'incomes',
  'categories',
  'budgets',
  'recurring',
  'paymentMethods',
  'settings',
  // Note: 'profile' and 'admin' are excluded because they have dedicated buttons in the UI
  // and should not be managed as toggleable features
];

const FeatureManager: React.FC<FeatureManagerProps> = ({
  enabledFeatures,
  tabFeatures,
  hamburgerFeatures,
  onUpdate,
  onReset,
}) => {
  const { t } = useLanguage();
  // Migrate old feature names to new ones
  const migrateFeatures = (features: FeatureTab[]): FeatureTab[] => {
    return features
      .map((feature) => {
        // Convert old 'cards' and 'ewallets' to new 'paymentMethods'
        const featureStr = feature as string;
        if (featureStr === 'cards' || featureStr === 'ewallets') {
          return 'paymentMethods' as FeatureTab;
        }
        return feature;
      })
      .filter((feature, index, array) => {
        // Remove duplicates (e.g., both 'cards' and 'ewallets' -> 'paymentMethods')
        return array.indexOf(feature) === index;
      })
      .filter((feature) => {
        // Filter out any features that don't have metadata
        return FEATURE_METADATA[feature] !== undefined;
      })
      .filter((feature) => {
        // Filter out profile and admin - these have dedicated buttons and shouldn't be in feature lists
        return feature !== 'profile' && feature !== 'admin';
      });
  };

  // Initialize with separate tab and hamburger features, or fall back to enabledFeatures
  const [localTabFeatures, setLocalTabFeatures] = useState<FeatureTab[]>(
    migrateFeatures(tabFeatures || enabledFeatures)
  );
  const [localHamburgerFeatures, setLocalHamburgerFeatures] = useState<FeatureTab[]>(
    migrateFeatures(hamburgerFeatures || enabledFeatures)
  );
  const [activeLocation, setActiveLocation] = useState<'tab' | 'hamburger'>('tab');
  const [draggedItem, setDraggedItem] = useState<FeatureTab | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Track hover/focus state for add (+) buttons to apply interactive styles
  const [hoveredAdd, setHoveredAdd] = useState<FeatureTab | null>(null);

  // Update local state when props change
  useEffect(() => {
    setLocalTabFeatures(migrateFeatures(tabFeatures || enabledFeatures));
    setLocalHamburgerFeatures(migrateFeatures(hamburgerFeatures || enabledFeatures));
  }, [enabledFeatures, tabFeatures, hamburgerFeatures]);

  // Check if there are unsaved changes
  useEffect(() => {
    const tabChanged =
      localTabFeatures.length !== (tabFeatures || enabledFeatures).length ||
      localTabFeatures.some((feature, index) => feature !== (tabFeatures || enabledFeatures)[index]);
    const hamburgerChanged =
      localHamburgerFeatures.length !== (hamburgerFeatures || enabledFeatures).length ||
      localHamburgerFeatures.some((feature, index) => feature !== (hamburgerFeatures || enabledFeatures)[index]);
    setHasChanges(tabChanged || hamburgerChanged);
  }, [localTabFeatures, localHamburgerFeatures, enabledFeatures, tabFeatures, hamburgerFeatures]);

  // Get current features based on active location
  const localEnabled = activeLocation === 'tab' ? localTabFeatures : localHamburgerFeatures;
  const setLocalEnabled = activeLocation === 'tab' ? setLocalTabFeatures : setLocalHamburgerFeatures;

  // Get disabled features
  const disabledFeatures = ALL_FEATURES.filter((feature) => !localEnabled.includes(feature));

  const handleToggleFeature = (feature: FeatureTab) => {
    if (localEnabled.includes(feature)) {
      // Disable feature (must have at least one enabled)
      if (localEnabled.length > 1) {
        setLocalEnabled(localEnabled.filter((f) => f !== feature));
      }
    } else {
      // Enable feature (add to end)
      setLocalEnabled([...localEnabled, feature]);
    }
  };

  const handleDragStart = (feature: FeatureTab) => {
    setDraggedItem(feature);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    const currentIndex = localEnabled.indexOf(draggedItem);
    if (currentIndex === -1) return;

    const newOrder = [...localEnabled];
    newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    setLocalEnabled(newOrder);
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(localTabFeatures, localTabFeatures, localHamburgerFeatures);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await onReset();
      setLocalTabFeatures([...DEFAULT_FEATURES]);
      setLocalHamburgerFeatures([...DEFAULT_FEATURES]);
      setShowResetConfirm(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{t('featureManager')}</h2>
          <p style={styles.subtitle}>{t('manageFeaturesDesc')}</p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={() => setShowResetConfirm(true)}
            style={styles.resetButton}
            disabled={isSaving}
          >
            {t('resetToDefaults')}
          </button>
          <button
            onClick={handleSave}
            style={{
              ...styles.saveButton,
              ...((!hasChanges || isSaving) ? styles.saveButtonDisabled : {})
            }}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? t('saving') : t('saveSettings')}
          </button>
        </div>
      </div>

      {/* Changes indicator */}
      {hasChanges && (
        <div style={styles.warningBanner}>
          ⚠️ {t('unsavedChanges')}
        </div>
      )}

      {/* Location selector tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabsList}>
          <button
            onClick={() => setActiveLocation('tab')}
            style={{
              ...styles.tabButton,
              ...(activeLocation === 'tab' ? styles.tabButtonActive : styles.tabButtonInactive)
            }}
          >
            📑 {t('tabsLocation') || 'Tabs'}
          </button>
          <button
            onClick={() => setActiveLocation('hamburger')}
            style={{
              ...styles.tabButton,
              ...(activeLocation === 'hamburger' ? styles.tabButtonActive : styles.tabButtonInactive)
            }}
          >
            ☰ {t('hamburgerLocation') || 'Hamburger Menu'}
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Enabled Features */}
        <div>
          <h3 style={styles.sectionTitle}>
            {t('enabledFeatures')} ({localEnabled.length})
          </h3>
          <p style={styles.sectionDesc}>{t('dragToReorder')}</p>
          
          <div style={styles.list}>
            {localEnabled.map((feature, index) => {
              const metadata = FEATURE_METADATA[feature];
              // Skip if metadata is not found (safety check)
              if (!metadata) return null;
              
              const isDragging = draggedItem === feature;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={feature}
                  draggable
                  onDragStart={() => handleDragStart(feature)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    ...styles.card,
                    ...(isDragging ? styles.cardDragging : {}),
                    ...(isDragOver ? styles.cardDragOver : {}),
                  }}
                >
                  <DragIcon size={20} style={styles.dragHandle} />
                  <span style={styles.featureIcon}>{metadata.icon}</span>
                  <div style={styles.featureInfo}>
                    <div style={styles.featureName}>{t(metadata.labelKey)}</div>
                    <div style={styles.featureDesc}>
                      {metadata.description}
                    </div>
                  </div>
                  {/* Position input field */}
                  <div style={styles.positionInputContainer}>
                    <input
                      type="number"
                      min="1"
                      max={localEnabled.length}
                      value={index + 1}
                      onChange={(e) => {
                        const newPosition = parseInt(e.target.value) - 1;
                        if (newPosition >= 0 && newPosition < localEnabled.length && newPosition !== index) {
                          const newOrder = [...localEnabled];
                          newOrder.splice(index, 1);
                          newOrder.splice(newPosition, 0, feature);
                          setLocalEnabled(newOrder);
                        }
                      }}
                      style={styles.positionInput}
                      title={t('position')}
                    />
                  </div>
                  <button
                    onClick={() => handleToggleFeature(feature)}
                    style={{
                      ...styles.removeButton,
                      ...(localEnabled.length === 1 ? styles.actionButtonDisabled : {})
                    }}
                    aria-label="Disable feature"
                    title={t('disableFeature') || 'Disable feature'}
                    disabled={localEnabled.length === 1}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Features */}
        <div>
          <h3 style={styles.sectionTitle}>
            {t('availableFeatures')} ({disabledFeatures.length})
          </h3>
          <p style={styles.sectionDesc}>
            Click to enable a feature
          </p>
          
          <div style={styles.list}>
            {disabledFeatures.length === 0 ? (
              <div style={styles.emptyState}>
                All features are enabled
              </div>
            ) : (
              disabledFeatures.map((feature) => {
                const metadata = FEATURE_METADATA[feature];
                // Skip if metadata is not found (safety check)
                if (!metadata) return null;
                
                return (
                  <div
                    key={feature}
                    style={styles.cardDisabled}
                    onClick={() => handleToggleFeature(feature)}
                  >
                    <span style={styles.featureIconDisabled}>{metadata.icon}</span>
                    <div style={styles.featureInfo}>
                      <div style={styles.featureNameDisabled}>{t(metadata.labelKey)}</div>
                      <div style={styles.featureDesc}>
                        {metadata.description}
                      </div>
                    </div>
                    <button
                      style={{
                        ...styles.addButton,
                        ...(hoveredAdd === feature ? styles.addButtonHover : {})
                      }}
                      onMouseEnter={() => setHoveredAdd(feature)}
                      onMouseLeave={() => setHoveredAdd((prev) => prev === feature ? null : prev)}
                      onFocus={() => setHoveredAdd(feature)}
                      onBlur={() => setHoveredAdd((prev) => prev === feature ? null : prev)}
                      aria-label="Enable feature"
                    >
                      +
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title={t('resetToDefaults')}
        message={t('confirmResetFeatures')}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
        variant="warning"
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    padding: '24px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    boxShadow: '0 4px 6px var(--shadow)',
  },
  header: {
    display: 'flex',
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  title: {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  resetButton: {
    padding: '8px 16px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    transition: 'all 0.2s',
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600' as const,
    transition: 'all 0.2s',
  },
  saveButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  warningBanner: {
    padding: '12px 16px',
    backgroundColor: 'var(--warning-bg)',
    border: '1px solid var(--warning-border)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--warning-text)',
  },
  tabsContainer: {
    borderBottom: '1px solid var(--border-color)',
  },
  tabsList: {
    display: 'flex',
    gap: '16px',
  },
  tabButton: {
    padding: '12px 16px',
    fontSize: '15px',
    fontWeight: '600' as const,
    borderBottom: '2px solid transparent',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottomWidth: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabButtonActive: {
    borderBottomColor: 'var(--accent-primary)',
    color: 'var(--accent-primary)',
  },
  tabButtonInactive: {
    borderBottomColor: 'transparent',
    color: 'var(--text-secondary)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  sectionDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    cursor: 'move',
    transition: 'all 0.2s',
  },
  cardDragging: {
    opacity: 0.5,
  },
  cardDragOver: {
    borderColor: 'var(--accent-primary)',
    backgroundColor: 'var(--accent-light)',
  },
  cardDisabled: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dragHandle: {
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  featureIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  featureIconDisabled: {
    fontSize: '24px',
    flexShrink: 0,
    opacity: 0.5,
  },
  featureInfo: {
    flex: 1,
    minWidth: 0,
  },
  featureName: {
    fontSize: '15px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  featureNameDisabled: {
    fontSize: '15px',
    fontWeight: '600' as const,
    color: 'var(--text-secondary)',
  },
  featureDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  positionInputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  positionInput: {
    width: '50px',
    padding: '4px 8px',
    fontSize: '14px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    textAlign: 'center' as const,
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
  },
  actionButton: {
    padding: '8px',
    color: 'var(--success-text)',
    backgroundColor: 'var(--success-bg)',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  removeButton: {
    padding: '8px',
    color: 'var(--error-text)',
    backgroundColor: 'var(--error-bg)',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600' as const,
    lineHeight: 1,
  },
  addButton: {
    padding: '8px',
    color: 'var(--success-text)',
    backgroundColor: 'var(--success-bg)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    flexShrink: 0,
    fontSize: '20px',
    fontWeight: 'bold' as const,
    lineHeight: 1,
    transition: 'filter 0.15s ease',
  },
  addButtonHover: {
    filter: 'brightness(1.15)',
    boxShadow: '0 0 0 2px var(--success-bg), 0 0 0 4px rgba(0,0,0,0.4)',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px',
    color: 'var(--text-tertiary)',
    fontSize: '14px',
  },
};

export default FeatureManager;
