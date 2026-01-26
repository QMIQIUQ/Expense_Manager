import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUserSettings } from '../contexts/UserSettingsContext';
import { userSettingsService } from '../services/userSettingsService';
import { useNotification } from '../contexts/NotificationContext';
import { TimeFormat, DateFormat } from '../types';
import PWAInstallButton from '../components/PWAInstallButton';
import './UserProfile.css';

const UserProfile: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { 
    timeFormat: contextTimeFormat, 
    dateFormat: contextDateFormat,
    setTimeFormat: setContextTimeFormat,
    setDateFormat: setContextDateFormat,
    refreshSettings: _refreshSettings 
  } = useUserSettings();
  void _refreshSettings; // Keep for potential future use
  const [billingCycleDay, setBillingCycleDay] = useState<number>(1);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(contextTimeFormat);
  const [dateFormat, setDateFormat] = useState<DateFormat>(contextDateFormat);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Sync local state with context when context changes
  useEffect(() => {
    setTimeFormat(contextTimeFormat);
    setDateFormat(contextDateFormat);
  }, [contextTimeFormat, contextDateFormat]);

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
      await setContextTimeFormat(format);
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
      await setContextDateFormat(format);
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
    { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY', example: 'Dec 04, 2024' },
    { value: 'DD MMM YYYY', label: 'DD MMM YYYY', example: '04 Dec 2024' },
  ];

  // Get current time example based on format
  const getTimeExample = (format: TimeFormat) => {
    const now = new Date();
    if (format === '24h') {
      return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else {
      return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  };

  return (
    <div className="profile-container">
      {/* Page Header */}
      <div className="profile-header">
        <h1 className="profile-title">{t('userProfile') || 'User Profile'}</h1>
      </div>
      
      {/* User Info Card */}
      <div className="profile-card">
        <div className="card-header">
          <div className="card-icon user-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h2 className="card-title">{t('accountInfo') || 'Account Information'}</h2>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">{t('email') || 'Email'}</span>
            <span className="info-value">{currentUser?.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{t('userId') || 'User ID'}</span>
            <span className="info-value info-value-mono">{currentUser?.uid}</span>
          </div>
        </div>
      </div>

      {/* Display Settings Card */}
      <div className="profile-card">
        <div className="card-header">
          <div className="card-icon display-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <h2 className="card-title">{t('displaySettings')}</h2>
        </div>
        
        {!loading && (
          <div className="settings-content">
            {/* Time Format Section */}
            <div className="setting-section">
              <div className="setting-label-row">
                <span className="setting-label">{t('timeFormatSettings')}</span>
                <span className="setting-preview">
                  {t('preview') || 'Preview'}: <strong>{getTimeExample(timeFormat)}</strong>
                </span>
              </div>
              <div className="toggle-switch-container">
                <button
                  type="button"
                  onClick={() => handleTimeFormatChange('24h')}
                  disabled={saving}
                  className={`toggle-option ${timeFormat === '24h' ? 'active' : ''}`}
                >
                  <span className="toggle-time">14:30</span>
                  <span className="toggle-text">{t('timeFormat24h')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeFormatChange('12h')}
                  disabled={saving}
                  className={`toggle-option ${timeFormat === '12h' ? 'active' : ''}`}
                >
                  <span className="toggle-time">2:30 PM</span>
                  <span className="toggle-text">{t('timeFormat12h')}</span>
                </button>
              </div>
            </div>

            {/* Date Format Section */}
            <div className="setting-section">
              <div className="setting-label-row">
                <span className="setting-label">{t('dateFormatSettings')}</span>
              </div>
              <div className="date-format-grid">
                {dateFormatOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDateFormatChange(option.value)}
                    disabled={saving}
                    className={`date-format-option ${dateFormat === option.value ? 'active' : ''}`}
                  >
                    <span className="date-format-example">{option.example}</span>
                    <span className="date-format-label">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Billing Cycle Card */}
      <div className="profile-card">
        <div className="card-header">
          <div className="card-icon billing-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h2 className="card-title">{t('billingCycleSettings')}</h2>
        </div>
        
        {!loading && (
          <div className="settings-content">
            <div className="setting-section">
              <p className="setting-description">{t('billingCycleDescription')}</p>
              <div className="billing-input-row">
                <div className="billing-input-group">
                  <label className="billing-label">{t('monthlyResetDay')}</label>
                  <div className="billing-input-wrapper">
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
                      className="billing-input"
                      disabled={saving}
                    />
                    <span className="billing-suffix">{t('dayOfMonth') || 'of each month'}</span>
                  </div>
                  <span className="billing-hint">{t('billingCycleHint')}</span>
                </div>
                <button
                  onClick={handleSaveBillingCycle}
                  className={`save-button ${saving ? 'saving' : ''}`}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner"></span>
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                      </svg>
                      {t('save')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PWA Installation Card */}
      <div className="profile-card">
        <div className="card-header">
          <div className="card-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>
          <h2 className="card-title">安裝 PWA 應用程式</h2>
        </div>
        <div className="settings-content">
          <PWAInstallButton />
        </div>
      </div>

      {/* Account Settings Card */}
      <div className="profile-card">
        <div className="card-header">
          <div className="card-icon settings-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <h2 className="card-title">{t('accountSettings')}</h2>
        </div>
        <div className="settings-content">
          <div className="info-notice">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>{t('contactAdminForChanges')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
