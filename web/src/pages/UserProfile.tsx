import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { userSettingsService } from '../services/userSettingsService';
import { useNotification } from '../contexts/NotificationContext';
import { TimeFormat, DateFormat } from '../types';

const UserProfile: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const [billingCycleDay, setBillingCycleDay] = useState<number>(1);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h');
  const [dateFormat, setDateFormat] = useState<DateFormat>('YYYY-MM-DD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadSettings = async () => {
    if (!currentUser) return;
    
    try {
      const settings = await userSettingsService.getOrCreate(currentUser.uid);
      setBillingCycleDay(settings.billingCycleDay);
      setTimeFormat(settings.timeFormat || '24h');
      setDateFormat(settings.dateFormat || 'YYYY-MM-DD');
    } catch (error) {
      console.error('Error loading user settings:', error);
      showNotification('error', t('errorLoadingSettings'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBillingCycle = async () => {
    if (!currentUser) return;
    
    if (billingCycleDay < 1 || billingCycleDay > 31) {
      showNotification('error', t('invalidBillingCycleDay'));
      return;
    }
    
    setSaving(true);
    try {
      await userSettingsService.update(currentUser.uid, { billingCycleDay });
      showNotification('success', t('settingsSaved'));
    } catch (error) {
      console.error('Error saving billing cycle day:', error);
      showNotification('error', t('errorSavingSettings'));
    } finally {
      setSaving(false);
    }
  };

  const handleTimeFormatChange = async (format: TimeFormat) => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      await userSettingsService.update(currentUser.uid, { timeFormat: format });
      setTimeFormat(format);
      showNotification('success', t('settingsSaved'));
    } catch (error) {
      console.error('Error saving time format:', error);
      showNotification('error', t('errorSavingSettings'));
    } finally {
      setSaving(false);
    }
  };

  const handleDateFormatChange = async (format: DateFormat) => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      await userSettingsService.update(currentUser.uid, { dateFormat: format });
      setDateFormat(format);
      showNotification('success', t('settingsSaved'));
    } catch (error) {
      console.error('Error saving date format:', error);
      showNotification('error', t('errorSavingSettings'));
    } finally {
      setSaving(false);
    }
  };

  const dateFormatOptions: { value: DateFormat; label: string; example: string }[] = [
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-04' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '04/12/2024' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/04/2024' },
    { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD', example: '2024/12/04' },
  ];

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>User Profile</h2>
      
      <div style={styles.section}>
        <div style={styles.infoRow}>
          <span style={styles.label}>Email:</span>
          <span style={styles.value}>{currentUser?.email}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.label}>User ID:</span>
          <span style={styles.value}>{currentUser?.uid}</span>
        </div>
      </div>

      {/* Display Settings Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t('displaySettings')}</h3>
        <div style={styles.settingCard}>
          <div style={styles.settingHeader}>
            <div>
              <h4 style={styles.settingTitle}>{t('timeFormatSettings')}</h4>
              <p style={styles.settingDescription}>
                {t('displaySettingsDescription')}
              </p>
            </div>
          </div>
          {!loading && (
            <div style={styles.form}>
              {/* Time Format Toggle */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('timeFormatSettings')}</label>
                <div style={styles.toggleContainer}>
                  <button
                    type="button"
                    onClick={() => handleTimeFormatChange('24h')}
                    disabled={saving}
                    style={{
                      ...styles.toggleButton,
                      ...(timeFormat === '24h' ? styles.toggleButtonActive : {}),
                    }}
                  >
                    <span style={styles.toggleEmoji}>☀️</span>
                    <span style={styles.toggleSliderIcon}>⬅️➡️</span>
                    <span style={styles.toggleEmoji}>🌙</span>
                    <div style={styles.toggleLabel}>{t('timeFormat24h')}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeFormatChange('12h')}
                    disabled={saving}
                    style={{
                      ...styles.toggleButton,
                      ...(timeFormat === '12h' ? styles.toggleButtonActive : {}),
                    }}
                  >
                    <span style={styles.toggleSliderIcon}>⬅️➡️</span>
                    <span style={styles.ampmBadge}>AM/PM</span>
                    <div style={styles.toggleLabel}>{t('timeFormat12h')}</div>
                  </button>
                </div>
              </div>

              {/* Date Format Select */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('dateFormatSettings')}</label>
                <select
                  value={dateFormat}
                  onChange={(e) => handleDateFormatChange(e.target.value as DateFormat)}
                  style={styles.select}
                  disabled={saving}
                >
                  {dateFormatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.example})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t('billingCycleSettings')}</h3>
        <div style={styles.settingCard}>
          <div style={styles.settingHeader}>
            <div>
              <h4 style={styles.settingTitle}>{t('monthlyResetDay')}</h4>
              <p style={styles.settingDescription}>
                {t('billingCycleDescription')}
              </p>
            </div>
          </div>
          {!loading && (
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('selectDay')} (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={billingCycleDay || ''}
                  onChange={(e) => setBillingCycleDay(e.target.value === '' ? 0 : parseInt(e.target.value))}
                  onBlur={(e) => {
                    if (!e.target.value || parseInt(e.target.value) < 1) {
                      setBillingCycleDay(1);
                    }
                  }}
                  style={styles.input}
                  disabled={saving}
                />
                <span style={styles.helpText}>
                  {t('billingCycleHint')}
                </span>
              </div>
              <button
                onClick={handleSaveBillingCycle}
                style={{
                  ...styles.submitButton,
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
                disabled={saving}
              >
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t('accountSettings')}</h3>
        <div style={styles.settingCard}>
          <div>
            <p style={styles.settingDescription}>
              {t('contactAdminForChanges')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700' as const,
    color: 'var(--text-primary)',
    marginBottom: '24px',
  },
  section: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  infoRow: {
    display: 'flex',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  label: {
    flex: '0 0 120px',
    fontWeight: '500' as const,
    color: 'var(--text-secondary)',
  },
  value: {
    flex: 1,
    color: 'var(--text-primary)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
    marginBottom: '16px',
    marginTop: 0,
  },
  settingCard: {
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  settingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
    margin: '0 0 4px 0',
  },
  settingDescription: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  form: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formLabel: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: 'var(--text-secondary)',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  helpText: {
    display: 'block',
    marginTop: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  toggleContainer: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  toggleButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '16px 20px',
    border: '2px solid var(--border-color)',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '140px',
  },
  toggleButtonActive: {
    borderColor: 'var(--primary-color)',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
  },
  toggleEmoji: {
    fontSize: '20px',
  },
  toggleSliderIcon: {
    fontSize: '14px',
    margin: '4px 0',
    opacity: 0.6,
  },
  ampmBadge: {
    fontSize: '12px',
    fontWeight: '600' as const,
    padding: '4px 8px',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    borderRadius: '12px',
    margin: '4px 0',
  },
  toggleLabel: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    marginTop: '8px',
    textAlign: 'center' as const,
  },
};

export default UserProfile;
