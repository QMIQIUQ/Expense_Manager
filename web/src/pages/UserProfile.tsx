import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile: React.FC = () => {
  const { currentUser } = useAuth();

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
          <div>
            <p style={styles.settingDescription}>
              如需更改密碼或 Email，請聯繫系統管理員協助處理。
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
