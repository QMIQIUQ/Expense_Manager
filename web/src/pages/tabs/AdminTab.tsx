import React, { useState, useEffect, useCallback } from 'react';
import { adminService, UserMetadata } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import InlineLoading from '../../components/InlineLoading';
import ConfirmModal from '../../components/ConfirmModal';

const AdminTab: React.FC = () => {
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const [users, setUsers] = useState<UserMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  
  // User management modals
  const [editingUser, setEditingUser] = useState<UserMetadata | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersData = await adminService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail || !newPassword) {
      showNotification('error', 'Email and password are required');
      return;
    }

    if (newPassword.length < 6) {
      showNotification('error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setCreating(true);
      
      showNotification('info', 'Creating user account...');
      
      // Create Firebase Auth account AND metadata
      await adminService.createUser(newEmail, newPassword, newIsAdmin);
      
      // After creating user, we need to re-authenticate as admin
      // The admin will automatically be logged back in through onAuthStateChanged
      
      showNotification(
        'success', 
        `User account created successfully for ${newEmail}!`
      );
      
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      showNotification('error', errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: UserMetadata) => {
    if (user.id === currentUser?.uid) {
      showNotification('error', 'You cannot deactivate your own account');
      return;
    }

    try {
      if (user.isActive) {
        await adminService.deactivateUser(user.id);
        showNotification('success', 'User deactivated');
      } else {
        await adminService.activateUser(user.id);
        showNotification('success', 'User activated');
      }
      await loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      showNotification('error', 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.uid) {
      showNotification('error', 'You cannot delete your own account');
      return;
    }

    try {
      await adminService.deleteUserMetadata(userId);
      showNotification('success', 'User deleted successfully');
      setConfirmDelete(null);
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('error', 'Failed to delete user');
    }
  };

  const handleToggleAdmin = async (user: UserMetadata) => {
    if (user.id === currentUser?.uid) {
      showNotification('error', 'You cannot change your own admin status');
      return;
    }

    try {
      await adminService.updateUserMetadata(user.id, { isAdmin: !user.isAdmin });
      showNotification('success', `Admin status ${!user.isAdmin ? 'granted' : 'removed'}`);
      await loadUsers();
    } catch (error) {
      console.error('Error updating admin status:', error);
      showNotification('error', 'Failed to update admin status');
    }
  };

  const handleChangePasswordClick = (user: UserMetadata) => {
    setEditingUser(user);
    setShowPasswordModal(true);
  };

  const handleChangeEmailClick = (user: UserMetadata) => {
    setEditingUser(user);
    setShowEmailModal(true);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <InlineLoading size={24} />
        <p style={styles.loadingText}>Loading users...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>User Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={styles.createButton}
        >
          {showCreateForm ? '✕ Cancel' : '➕ Create User'}
        </button>
      </div>

      {showCreateForm && (
        <div style={styles.createForm}>
          <h3 style={styles.formTitle}>Create New User Account</h3>
          <div style={styles.notice}>
            <p style={styles.noticeTitle}>✨ Direct User Creation</p>
            <p style={styles.noticeText}>
              This form creates a complete Firebase Authentication account with user metadata.
            </p>
            <p style={styles.noticeText}>
              <strong>Note:</strong> After creating the user, you will remain logged in as admin.
            </p>
          </div>
          <form onSubmit={handleCreateUser}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onFocus={(e) => e.target.select()}
                required
                style={styles.input}
                placeholder="user@example.com"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Password *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={(e) => e.target.select()}
                required
                minLength={6}
                style={styles.input}
                placeholder="Minimum 6 characters"
              />
              <small style={styles.helpText}>Password must be at least 6 characters long</small>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Display Name (optional)</label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                onFocus={(e) => e.target.select()}
                style={styles.input}
                placeholder="John Doe"
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
                Grant admin privileges
              </label>
            </div>
            <button
              type="submit"
              disabled={creating}
              style={styles.submitButton}
            >
              {creating ? 'Creating User...' : 'Create User Account'}
            </button>
          </form>
        </div>
      )}

      <div style={styles.userList}>
        <div style={styles.userHeader}>
          <div style={{ flex: 2 }}>Email</div>
          <div style={{ flex: 1 }}>Status</div>
          <div style={{ flex: 1 }}>Role</div>
          <div style={{ flex: 2 }}>Actions</div>
        </div>
        {users.map(user => (
          <div key={user.id} style={styles.userRow}>
            <div style={{ flex: 2, ...styles.userEmail }}>
              {user.email}
              {user.id === currentUser?.uid && (
                <span style={styles.youBadge}>(You)</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <span style={user.isActive ? styles.activeBadge : styles.inactiveBadge}>
                {user.isActive ? '✓ Active' : '✕ Inactive'}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <span style={user.isAdmin ? styles.adminBadge : styles.userBadge}>
                {user.isAdmin ? '👑 Admin' : '👤 User'}
              </span>
            </div>
            <div style={{ flex: 2, ...styles.actions }}>
              <button
                onClick={() => handleToggleActive(user)}
                disabled={user.id === currentUser?.uid}
                style={styles.actionButton}
                title={user.isActive ? 'Deactivate' : 'Activate'}
              >
                {user.isActive ? '🔒' : '🔓'}
              </button>
              <button
                onClick={() => handleToggleAdmin(user)}
                disabled={user.id === currentUser?.uid}
                style={styles.actionButton}
                title={user.isAdmin ? 'Remove admin' : 'Make admin'}
              >
                {user.isAdmin ? '👤' : '👑'}
              </button>
              <button
                onClick={() => handleChangePasswordClick(user)}
                style={styles.actionButton}
                title="Change password"
              >
                🔑
              </button>
              <button
                onClick={() => handleChangeEmailClick(user)}
                style={styles.actionButton}
                title="Change email"
              >
                ✉️
              </button>
              <button
                onClick={() => setConfirmDelete(user.id)}
                disabled={user.id === currentUser?.uid}
                style={styles.deleteButton}
                title="Delete user"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div style={styles.emptyState}>
          <p>No users found</p>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Delete User"
        message="Are you sure you want to delete this user? This will permanently delete all their data including expenses, categories, and budgets. This action cannot be undone."
        onConfirm={() => confirmDelete && handleDeleteUser(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        danger={true}
      />

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Change Password - {editingUser?.email}</h3>
            <div style={styles.modalNotice}>
              <p style={styles.noticeTitle}>⚠️ Limitation</p>
              <p style={styles.noticeText}>
                Changing passwords for other users requires Firebase Admin SDK access.
                This feature is not available in the web interface.
              </p>
              <p style={styles.noticeText}>
                <strong>To reset a user's password:</strong>
              </p>
              <ol style={styles.noticeList}>
                <li>Go to Firebase Console</li>
                <li>Navigate to Authentication → Users</li>
                <li>Find and select the user</li>
                <li>Click "Reset password"</li>
                <li>Send the password reset email to the user</li>
              </ol>
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setEditingUser(null);
                }}
                style={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Change Modal */}
      {showEmailModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Change Email - {editingUser?.email}</h3>
            <div style={styles.modalNotice}>
              <p style={styles.noticeTitle}>⚠️ Limitation</p>
              <p style={styles.noticeText}>
                Changing email addresses for other users requires Firebase Admin SDK access.
                This feature is not available in the web interface.
              </p>
              <p style={styles.noticeText}>
                <strong>To change a user's email:</strong>
              </p>
              <ol style={styles.noticeList}>
                <li>Go to Firebase Console</li>
                <li>Navigate to Authentication → Users</li>
                <li>Find and select the user</li>
                <li>Click the edit icon next to their email</li>
                <li>Enter the new email address</li>
              </ol>
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEditingUser(null);
                }}
                style={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600' as const,
    color: '#333',
  },
  createButton: {
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  createForm: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #e0e0e0',
  },
  formTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#333',
  },
  notice: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '4px',
    padding: '15px',
    marginBottom: '15px',
    color: '#856404',
  },
  noticeTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#856404',
  },
  noticeText: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    lineHeight: '1.4',
  },
  noticeList: {
    margin: '8px 0',
    paddingLeft: '20px',
    fontSize: '13px',
    lineHeight: '1.6',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  checkboxGroup: {
    marginBottom: '15px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#555',
    cursor: 'pointer',
  },
  checkbox: {
    marginRight: '8px',
    cursor: 'pointer',
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
  userList: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e0e0e0',
  },
  userHeader: {
    display: 'flex',
    padding: '12px 16px',
    backgroundColor: '#f5f5f5',
    fontWeight: '600' as const,
    fontSize: '14px',
    color: '#555',
    borderBottom: '2px solid #e0e0e0',
  },
  userRow: {
    display: 'flex',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    alignItems: 'center',
    fontSize: '14px',
  },
  userEmail: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  youBadge: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic' as const,
  },
  activeBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '4px',
    fontSize: '12px',
  },
  inactiveBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    fontSize: '12px',
  },
  adminBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderRadius: '4px',
    fontSize: '12px',
  },
  userBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#e7f3ff',
    color: '#004085',
    borderRadius: '4px',
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '6px 10px',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  deleteButton: {
    padding: '6px 10px',
    backgroundColor: '#ffebee',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
  },
  loadingText: {
    marginLeft: '12px',
    color: '#666',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#999',
  },
  helpText: {
    display: 'block',
    marginTop: '4px',
    fontSize: '12px',
    color: '#666',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#333',
  },
  modalNotice: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '4px',
    padding: '15px',
    marginBottom: '16px',
    color: '#856404',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default AdminTab;
