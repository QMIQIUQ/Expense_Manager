import React, { useState, useEffect } from 'react';
import { FeatureTab, DEFAULT_FEATURES } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { TranslationKey } from '../../locales/translations';
import { DragIcon, CheckIcon } from '../icons';
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('featureManager')}</h2>
          <p className="text-sm text-gray-600 mt-1">{t('manageFeaturesDesc')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            {t('resetToDefaults')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? t('saving') : t('saveSettings')}
          </button>
        </div>
      </div>

      {/* Changes indicator */}
      {hasChanges && (
        <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          ⚠️ {t('unsavedChanges')}
        </div>
      )}

      {/* Location selector tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveLocation('tab')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeLocation === 'tab'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            📑 {t('tabsLocation') || 'Tabs'}
          </button>
          <button
            onClick={() => setActiveLocation('hamburger')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeLocation === 'hamburger'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            ☰ {t('hamburgerLocation') || 'Hamburger Menu'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enabled Features */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {t('enabledFeatures')} ({localEnabled.length})
          </h3>
          <p className="text-sm text-gray-600 mb-4">{t('dragToReorder')}</p>
          
          <div className="flex flex-col gap-2">
            {localEnabled.map((feature, index) => {
              const metadata = FEATURE_METADATA[feature];
              // Skip if metadata is not found (safety check)
              if (!metadata) return null;
              
              return (
                <div
                  key={feature}
                  draggable
                  onDragStart={() => handleDragStart(feature)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-4 bg-white border rounded-lg cursor-move transition-all ${
                    draggedItem === feature
                      ? 'opacity-50'
                      : dragOverIndex === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <DragIcon size={20} className="text-gray-400 flex-shrink-0" />
                  <span className="text-2xl flex-shrink-0">{metadata.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{t(metadata.labelKey)}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {metadata.description}
                    </div>
                  </div>
                  {/* Position input field */}
                  <div className="flex items-center gap-2 flex-shrink-0">
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
                      className="w-14 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title={t('position')}
                    />
                  </div>
                  <button
                    onClick={() => handleToggleFeature(feature)}
                    className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors flex-shrink-0"
                    aria-label="Disable feature"
                    disabled={localEnabled.length === 1}
                  >
                    <CheckIcon size={20} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Features */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {t('availableFeatures')} ({disabledFeatures.length})
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Click to enable a feature
          </p>
          
          <div className="flex flex-col gap-2">
            {disabledFeatures.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
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
                    className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleToggleFeature(feature)}
                  >
                    <span className="text-2xl flex-shrink-0 opacity-50">{metadata.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-700">{t(metadata.labelKey)}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {metadata.description}
                      </div>
                    </div>
                    <button
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
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

export default FeatureManager;
