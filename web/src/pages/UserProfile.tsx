import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const UserProfile: React.FC = () => {
  const { currentUser, changePassword, changeEmail } = useAuth();
  const { showNotification } = useNotification();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Email change state
  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showNotification('error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showNotification('error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      showNotification('success', 'Password changed successfully');
      
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      if (errorMessage.includes('auth/wrong-password') || errorMessage.includes('invalid-credential')) {
        showNotification('error', 'Current password is incorrect');
      } else {
        showNotification('error', errorMessage);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail || newEmail === currentUser?.email) {
      showNotification('error', 'Please enter a different email address');
      return;
    }

    try {
      setChangingEmail(true);
      await changeEmail(emailPassword, newEmail);
      showNotification('success', 'Email changed successfully');
      
      // Reset form
      setEmailPassword('');
      setNewEmail('');
      setShowEmailForm(false);
    } catch (error) {
      console.error('Error changing email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change email';
      if (errorMessage.includes('auth/wrong-password') || errorMessage.includes('invalid-credential')) {
        showNotification('error', 'Password is incorrect');
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        showNotification('error', 'This email is already in use');
      } else {
        showNotification('error', errorMessage);
      }
    } finally {
      setChangingEmail(false);
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
        <h3 style={styles.sectionTitle}>Account Settings</h3>
        
        <div style={styles.settingCard}>
          <div style={styles.settingHeader}>
            <div>
              <h4 style={styles.settingTitle}>Change Password</h4>
              <p style={styles.settingDescription}>Update your account password</p>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              style={styles.toggleButton}
            >
              {showPasswordForm ? 'Cancel' : 'Change'}
            </button>
          </div>
          
          {showPasswordForm && (
            <form onSubmit={handleChangePassword} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required
                  style={styles.input}
                  placeholder="Enter current password"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required
                  minLength={6}
                  style={styles.input}
                  placeholder="Enter new password"
                />
                <small style={styles.helpText}>Minimum 6 characters</small>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required
                  style={styles.input}
                  placeholder="Confirm new password"
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                style={styles.submitButton}
              >
                {changingPassword ? 'Changing...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        <div style={styles.settingCard}>
          <div style={styles.settingHeader}>
            <div>
              <h4 style={styles.settingTitle}>Change Email</h4>
              <p style={styles.settingDescription}>Update your email address</p>
            </div>
            <button
              onClick={() => setShowEmailForm(!showEmailForm)}
              style={styles.toggleButton}
            >
              {showEmailForm ? 'Cancel' : 'Change'}
            </button>
          </div>
          
          {showEmailForm && (
            <form onSubmit={handleChangeEmail} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>New Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required
                  style={styles.input}
                  placeholder="Enter new email"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Current Password</label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required
                  style={styles.input}
                  placeholder="Enter password to confirm"
                />
                <small style={styles.helpText}>Required for security verification</small>
              </div>
              <button
                type="submit"
                disabled={changingEmail}
                style={styles.submitButton}
              >
                {changingEmail ? 'Changing...' : 'Update Email'}
              </button>
            </form>
          )}
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
    color: '#333',
    marginBottom: '24px',
  },
  section: {
    backgroundColor: 'white',
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
    color: '#666',
  },
  value: {
    flex: 1,
    color: '#333',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: '16px',
    marginTop: 0,
  },
  settingCard: {
    border: '1px solid #e0e0e0',
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
    color: '#333',
    margin: '0 0 4px 0',
  },
  settingDescription: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  toggleButton: {
    padding: '8px 16px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
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
    color: '#555',
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
    color: '#666',
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
