import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { userSettingsService } from '../services/userSettingsService';
import { useNotification } from '../contexts/NotificationContext';

const UserProfile: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const [billingCycleDay, setBillingCycleDay] = useState<number>(1);
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

const styles = {
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
  // toggleButton removed with change password/email UI
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
};

export default UserProfile;
