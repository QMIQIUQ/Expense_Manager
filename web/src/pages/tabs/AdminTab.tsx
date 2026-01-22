import React, { useState, useEffect, useCallback } from 'react';
import { adminService, UserMetadata } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import InlineLoading from '../../components/InlineLoading';
import ConfirmModal from '../../components/ConfirmModal';
import { PlusIcon, CloseIcon, DeleteIcon } from '../../components/icons';
// appConfig not needed after removing delete action

// Inject responsive styles for admin tab
const injectResponsiveStyles = () => {
  const styleId = 'admin-tab-responsive-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media (max-width: 768px) {
        .admin-user-list {
          overflow-x: auto;
        }
        
        .admin-user-header {
          display: none !important;
        }
        
        .admin-user-row {
          display: block !important;
          padding: 16px !important;
          margin-bottom: 12px;
          border: 1px solid var(--border-color) !important;
          border-radius: 12px !important;
          background: var(--card-bg) !important;
        }
        
        .admin-user-row > div {
          flex: none !important;
          width: 100% !important;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .admin-user-row > div:last-child {
          margin-bottom: 0;
        }
        
        .admin-user-row > div::before {
          content: attr(data-label);
          font-weight: 600;
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .admin-actions {
          flex-wrap: wrap !important;
          justify-content: flex-start !important;
          gap: 8px !important;
        }
        
        .admin-actions::before {
          width: 100%;
        }
        
        .admin-header {
          flex-direction: column;
          align-items: flex-start !important;
          gap: 16px;
        }
        
        .admin-header button {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  }
};

const AdminTab: React.FC = () => {
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Delete action removed: no confirm dialog or delete state
  
  // Inject responsive styles on mount
  useEffect(() => {
    injectResponsiveStyles();
  }, []);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  
  // Change password/email actions removed from Admin UI
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersData = await adminService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('error', t('failedLoadUsers'));
    } finally {
      setLoading(false);
    }
  }, [showNotification, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail || !newPassword) {
      showNotification('error', t('emailPasswordRequired'));
      return;
    }

    if (newPassword.length < 6) {
      showNotification('error', t('passwordAtLeast6'));
      return;
    }

    try {
      setCreating(true);
      
      showNotification('info', t('creatingUser'));
      
      // Create Firebase Auth account AND metadata
      await adminService.createUser(newEmail, newPassword, newIsAdmin);
      
      // After creating user, we need to re-authenticate as admin
      // The admin will automatically be logged back in through onAuthStateChanged
      
      showNotification('success', `${t('userCreated')} (${newEmail})`);
      
      // Reset form
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      setNewIsAdmin(false);
      setShowCreateForm(false);
      
      // Reload users - the auth state has been handled by adminService
      await loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      // If email already exists, offer/reset password flow
      const code = (error as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        try {
          await adminService.sendPasswordReset(newEmail);
          showNotification('info', `${t('emailExistsResetSent')} ${newEmail}`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to send reset email';
          showNotification('error', `${t('failedSendResetEmail')}: ${msg}`);
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
        showNotification('error', errorMessage);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: UserMetadata) => {
    if (user.id === currentUser?.uid) {
      showNotification('error', t('cannotDeactivateSelf'));
      return;
    }

    try {
      if (user.isActive) {
        await adminService.deactivateUser(user.id);
        showNotification('success', t('userDeactivated'));
      } else {
        await adminService.activateUser(user.id);
        showNotification('success', t('userActivated'));
      }
      await loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      showNotification('error', t('failedUpdateUserStatus'));
    }
  };

  // Deletion of accounts handled outside the app (script or Firebase Console)

  const handleToggleAdmin = async (user: UserMetadata) => {
    if (user.id === currentUser?.uid) {
      showNotification('error', t('cannotChangeOwnAdmin'));
      return;
    }

    try {
      await adminService.updateUserMetadata(user.id, { isAdmin: !user.isAdmin });
      showNotification('success', !user.isAdmin ? t('adminGranted') : t('adminRemoved'));
      await loadUsers();
    } catch (error) {
      console.error('Error updating admin status:', error);
      showNotification('error', t('failedUpdateAdminStatus'));
    }
  };

  // No-op: removed
  // Data-only delete to cleanup Firestore when Auth user was removed elsewhere
  const handleDeleteUserData = async (userId: string) => {
    if (userId === currentUser?.uid) {
      showNotification('error', t('cannotDeleteOwnData'));
      return;
    }

    try {
      await adminService.deleteUserMetadata(userId);
      showNotification('success', t('userDataDeleted'));
      setConfirmDelete(null);
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user data:', error);
      showNotification('error', t('deleteDataFailed'));
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <InlineLoading size={24} />
        <p style={styles.loadingText}>{t('loadingUsers')}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header} className="admin-header">
        <h2 style={styles.title}>{t('userManagement')}</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={styles.createButton}
        >
          {showCreateForm ? (
            <>
              <CloseIcon size={18} />
              <span>{t('cancel')}</span>
            </>
          ) : (
            <>
              <PlusIcon size={18} />
              <span>{t('createUser')}</span>
            </>
          )}
        </button>
      </div>

      <div style={styles.notice}>
        <p style={styles.noticeTitle}>{t('deleteAccountNotice')}</p>
        <p style={styles.noticeText}>
          {t('deleteAccountDescription')}
        </p>
      </div>

      {showCreateForm && (
        <div style={styles.createForm}>
          <h3 style={styles.formTitle}>{t('createNewUserAccount')}</h3>
          <div style={styles.notice}>
            <p style={styles.noticeTitle}>{t('directUserCreation')}</p>
            <p style={styles.noticeText}>
              {t('directUserCreationDescription')}
            </p>
            <p style={styles.noticeText}>
              <strong>{t('directUserCreationNote')}</strong>
            </p>
          </div>
          <form onSubmit={handleCreateUser}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('emailRequired')}</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onFocus={(e) => e.target.select()}
                required
                style={styles.input}
                placeholder={t('emailPlaceholder')}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('passwordRequired')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={(e) => e.target.select()}
                required
                minLength={6}
                style={styles.input}
                placeholder={t('passwordPlaceholder')}
              />
              <small style={styles.helpText}>{t('passwordMinLengthHint')}</small>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('displayNameOptional')}</label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                onFocus={(e) => e.target.select()}
                style={styles.input}
                placeholder={t('displayNamePlaceholder')}
              />
            </div>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                  style={styles.checkbox}
                />
                {t('grantAdminPrivileges')}
              </label>
            </div>
            <button
              type="submit"
              disabled={creating}
              style={styles.submitButton}
            >
              {creating ? t('creatingUserEllipsis') : t('createUserAccount')}
            </button>
          </form>
        </div>
      )}

      <div style={styles.userList} className="admin-user-list">
        <div style={styles.userHeader} className="admin-user-header">
          <div style={{ flex: 2 }}>{t('email')}</div>
          <div style={{ flex: 1 }}>{t('statusLabel')}</div>
          <div style={{ flex: 1 }}>{t('roleLabel')}</div>
          <div style={{ flex: 2 }}>{t('actionsLabel')}</div>
        </div>
        {users.map(user => (
          <div key={user.id} style={styles.userRow} className="admin-user-row">
            <div style={{ flex: 2, ...styles.userEmail }} data-label={t('email')}>
              {user.email}
              {user.id === currentUser?.uid && (
                <span style={styles.youBadge}>({t('you')})</span>
              )}
            </div>
            <div style={{ flex: 1 }} data-label={t('statusLabel')}>
              <span style={user.isActive ? styles.activeBadge : styles.inactiveBadge}>
                {user.isActive ? `✓ ${t('active')}` : `✕ ${t('inactive')}`}
              </span>
            </div>
            <div style={{ flex: 1 }} data-label={t('roleLabel')}>
              <span style={user.isAdmin ? styles.adminBadge : styles.userBadge}>
                {user.isAdmin ? `👑 ${t('admin')}` : `👤 ${t('user')}`}
              </span>
            </div>
            <div style={{ flex: 2, ...styles.actions }} className="admin-actions" data-label={t('actionsLabel')}>
              <button
                onClick={() => handleToggleActive(user)}
                disabled={user.id === currentUser?.uid}
                style={styles.actionButton}
                title={user.isActive ? t('deactivate') : t('activate')}
              >
                {user.isActive ? '🔒' : '🔓'}
              </button>
              <button
                onClick={() => handleToggleAdmin(user)}
                disabled={user.id === currentUser?.uid}
                style={styles.actionButton}
                title={user.isAdmin ? t('removeAdmin') : t('makeAdmin')}
              >
                {user.isAdmin ? '👤' : '👑'}
              </button>
              {/* Change password/email actions removed */}
              <button
                onClick={() => setConfirmDelete(user.id)}
                disabled={user.id === currentUser?.uid}
                style={styles.deleteButton}
                title={t('deleteDataDescription')}
              >
                <DeleteIcon size={16} />
                <span>{t('deleteData')}</span>
              </button>
              {/* Delete action intentionally removed */}
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div style={styles.emptyState}>
          <p>{t('noUsersFound')}</p>
        </div>
      )}

      {/* ConfirmModal removed as delete action is not available */}

      {/* Data-only delete confirmation */}
      <ConfirmModal
        isOpen={confirmDelete !== null}
        title={t('deleteDataTitle')}
        message={t('deleteDataConfirmMessage')}
        onConfirm={() => confirmDelete && handleDeleteUserData(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        danger={true}
      />
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700' as const,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600' as const,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px var(--shadow)',
  },
  createForm: {
    backgroundColor: 'var(--card-bg)',
    padding: '24px',
    borderRadius: '16px',
    marginBottom: '24px',
    border: '1px solid var(--border-color)',
    boxShadow: '0 4px 6px var(--shadow)',
  },
  formTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: '600' as const,
    color: 'var(--text-primary)',
  },
  notice: {
    backgroundColor: 'var(--warning-bg)',
    border: '1px solid var(--warning-border)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    color: 'var(--warning-text)',
  },
  noticeTitle: {
    margin: '0 0 8px 0',
    fontSize: '15px',
    fontWeight: '600' as const,
    color: 'var(--warning-text)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  noticeText: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    lineHeight: '1.5',
    color: 'var(--text-secondary)',
  },
  noticeList: {
    margin: '8px 0',
    paddingLeft: '20px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: 'var(--text-secondary)',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: 'var(--text-secondary)',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '15px',
    boxSizing: 'border-box' as const,
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s',
  },
  checkboxGroup: {
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: '500' as const,
  },
  checkbox: {
    marginRight: '12px',
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600' as const,
    width: '100%',
    transition: 'opacity 0.2s',
  },
  userList: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    boxShadow: '0 4px 6px var(--shadow)',
  },
  userHeader: {
    display: 'flex',
    padding: '16px 24px',
    backgroundColor: 'var(--bg-secondary)',
    fontWeight: '600' as const,
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--border-color)',
  },
  userRow: {
    display: 'flex',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-color)',
    alignItems: 'center',
    fontSize: '15px',
    color: 'var(--text-primary)',
    transition: 'background-color 0.2s',
  },
  userEmail: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '500' as const,
  },
  youBadge: {
    fontSize: '12px',
    color: 'var(--accent-primary)',
    backgroundColor: 'var(--accent-light)',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: '600' as const,
  },
  activeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success-text)',
    border: '1px solid var(--success-border)',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500' as const,
  },
  inactiveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    border: '1px solid var(--error-border)',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500' as const,
  },
  adminBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'var(--warning-bg)',
    color: 'var(--warning-text)',
    border: '1px solid var(--warning-border)',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500' as const,
  },
  userBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'var(--info-bg)',
    color: 'var(--info-text)',
    border: '1px solid var(--info-border)',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500' as const,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    padding: 0,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    color: 'var(--text-secondary)',
    transition: 'all 0.2s',
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'var(--error-bg)',
    border: '1px solid var(--error-border)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500' as const,
    color: 'var(--error-text)',
    transition: 'all 0.2s',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  loadingText: {
    color: 'var(--text-secondary)',
    fontSize: '16px',
  },
  emptyState: {
    padding: '60px',
    textAlign: 'center' as const,
    color: 'var(--text-tertiary)',
    fontSize: '16px',
  },
  helpText: {
    display: 'block',
    marginTop: '6px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--modal-overlay)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: 'var(--modal-bg)',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    border: '1px solid var(--border-color)',
  },
  modalTitle: {
    margin: '0 0 20px 0',
    fontSize: '24px',
    fontWeight: '700' as const,
    color: 'var(--text-primary)',
  },
  modalNotice: {
    backgroundColor: 'var(--warning-bg)',
    border: '1px solid var(--warning-border)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    color: 'var(--warning-text)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '32px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600' as const,
    transition: 'background-color 0.2s',
  },
};

export default AdminTab;
