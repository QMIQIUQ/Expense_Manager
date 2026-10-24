import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { DateShortcut, DateShortcutType } from '../../types';
import { DEFAULT_SHORTCUTS } from '../common/RadialDateMenu';

interface DateShortcutsSettingsProps {
  initialShortcuts?: DateShortcut[];
  onSave: (shortcuts: DateShortcut[]) => Promise<void>;
}

// Shortcut labels for display
const SHORTCUT_LABELS: Record<DateShortcutType, { en: string; zh: string; 'zh-CN': string }> = {
  today: { en: 'Today', zh: '今日', 'zh-CN': '今日' },
  yesterday: { en: 'Yesterday', zh: '昨日', 'zh-CN': '昨日' },
  '3days': { en: '3 days ago', zh: '3天前', 'zh-CN': '3天前' },
  lastWeek: { en: 'Last week', zh: '上週', 'zh-CN': '上周' },
  lastMonth: { en: 'Last month', zh: '上個月', 'zh-CN': '上个月' },
  monthStart: { en: 'Month start', zh: '月初', 'zh-CN': '月初' },
  lastMonthStart: { en: 'Last month start', zh: '上月初', 'zh-CN': '上月初' },
  yearStart: { en: 'Year start', zh: '年初', 'zh-CN': '年初' },
};

const DateShortcutsSettings: React.FC<DateShortcutsSettingsProps> = ({
  initialShortcuts,
  onSave,
}) => {
  const { t, language } = useLanguage();
  const [shortcuts, setShortcuts] = useState<DateShortcut[]>(
    initialShortcuts || DEFAULT_SHORTCUTS
  );
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (initialShortcuts) {
      setShortcuts(initialShortcuts);
    }
  }, [initialShortcuts]);

  const handleToggle = (type: DateShortcutType) => {
    setShortcuts((prev) =>
      prev.map((s) =>
        s.type === type ? { ...s, enabled: !s.enabled } : s
      )
    );
    setHasChanges(true);
  };

  const handleResetToDefaults = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(shortcuts);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving date shortcuts:', error);
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = shortcuts.filter(s => s.enabled).length;

  return (
    <div
      style={{
        padding: 'var(--ui-space-20px)',
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--ui-radius-12px)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ marginBottom: 'var(--ui-space-16px)' }}>
        <h3 style={{
          margin: 'var(--ui-space-0px) var(--ui-space-0px) var(--ui-space-8px) var(--ui-space-0px)',
          color: 'var(--text-primary)',
          fontSize: 'var(--ui-font-16px)',
          fontWeight: 600,
        }}>
          {t('dateShortcutsSettings') || 'Date Shortcuts Settings'}
        </h3>
        <p style={{
          margin: 'var(--ui-space-0px)',
          color: 'var(--text-secondary)',
          fontSize: 'var(--ui-font-13px)',
        }}>
          {t('dateShortcutsDesc') || 'Customize which date shortcuts appear in the long-press menu'}
        </p>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--ui-space-8px)',
        marginBottom: 'var(--ui-space-16px)',
        padding: 'var(--ui-space-12px)',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--ui-radius-8px)',
      }}>
        <span style={{ fontSize: 'var(--ui-font-20px)' }}>ℹ️</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--ui-font-13px)' }}>
          {enabledCount} {t('shortcutsEnabled') || 'shortcuts enabled'}
        </span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ui-space-8px)',
        marginBottom: 'var(--ui-space-16px)',
      }}>
        {shortcuts.map((shortcut) => {
          const label = SHORTCUT_LABELS[shortcut.type][language] || SHORTCUT_LABELS[shortcut.type].en;

          return (
            <label
              key={shortcut.type}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--ui-space-12px)',
                backgroundColor: shortcut.enabled ? 'var(--accent-light)' : 'var(--bg-secondary)',
                border: `1px solid ${shortcut.enabled ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: 'var(--ui-radius-8px)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="checkbox"
                checked={shortcut.enabled}
                onChange={() => handleToggle(shortcut.type)}
                style={{
                  marginRight: 'var(--ui-space-12px)',
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                }}
              />
              <span style={{
                flex: 1,
                color: 'var(--text-primary)',
                fontSize: 'var(--ui-font-14px)',
                fontWeight: shortcut.enabled ? 500 : 400,
              }}>
                {label}
              </span>
              {shortcut.angle != null && (
                <span style={{
                  color: 'var(--text-tertiary)',
                  fontSize: 'var(--ui-font-12px)',
                }}>
                  {shortcut.angle}°
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div style={{
        display: 'flex',
        gap: 'var(--ui-space-12px)',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{
            flex: 1,
            minWidth: '120px',
            padding: 'var(--ui-space-12px) var(--ui-space-20px)',
            backgroundColor: hasChanges ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: hasChanges ? 'white' : 'var(--text-tertiary)',
            border: 'none',
            borderRadius: 'var(--ui-radius-8px)',
            fontSize: 'var(--ui-font-14px)',
            fontWeight: 600,
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {saving ? (t('saving') || 'Saving...') : (t('saveChanges') || 'Save Changes')}
        </button>

        <button
          onClick={handleResetToDefaults}
          disabled={saving}
          style={{
            padding: 'var(--ui-space-12px) var(--ui-space-20px)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--ui-radius-8px)',
            fontSize: 'var(--ui-font-14px)',
            fontWeight: 500,
            cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {t('resetToDefaults') || 'Reset to Defaults'}
        </button>
      </div>
    </div>
  );
};

export default DateShortcutsSettings;
