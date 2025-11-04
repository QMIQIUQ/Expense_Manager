import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';

const UIDemo: React.FC = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const handleShowSuccessToast = () => {
    showSuccess('This is a success notification!');
  };

  const handleShowErrorToast = () => {
    showError('This is an error notification!');
  };

  const handleShowInfoToast = () => {
    showInfo('This is an info notification!');
  };

  const handleConfirmAction = () => {
    setShowConfirmDialog(false);
    showSuccess('Action confirmed!');
  };

  const handleShowLoading = () => {
    setShowLoading(true);
    setTimeout(() => {
      setShowLoading(false);
      showSuccess('Loading completed!');
    }, 3000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      {showLoading && <LoadingSpinner fullScreen />}
      
      <h1>UI Components Demo</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        This page demonstrates all the new UI/UX improvements including toast notifications,
        confirmation dialogs, and loading spinners.
      </p>

      <section style={{ marginBottom: '40px' }}>
        <h2>Toast Notifications</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Toast notifications appear in the top-right corner and auto-dismiss after 4 seconds.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleShowSuccessToast}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Show Success Toast
          </button>
          <button
            onClick={handleShowErrorToast}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Show Error Toast
          </button>
          <button
            onClick={handleShowInfoToast}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Show Info Toast
          </button>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Confirmation Dialog</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          A shared confirmation dialog for actions that need user confirmation.
        </p>
        <button
          onClick={() => setShowConfirmDialog(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Show Confirmation Dialog
        </button>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Loading Spinner</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          A full-screen loading spinner with animation.
        </p>
        <button
          onClick={handleShowLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Show Loading Spinner (3s)
        </button>
      </section>

      <section>
        <h2>Inline Spinner Example</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          A smaller inline loading spinner.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <LoadingSpinner size={24} color="#2196F3" />
          <span>Processing...</span>
        </div>
      </section>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Confirm Action"
        message="Are you sure you want to perform this action? This is a demo of the confirmation dialog."
        confirmText="Yes, Confirm"
        cancelText="Cancel"
        confirmButtonColor="#4CAF50"
        onConfirm={handleConfirmAction}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
};

export default UIDemo;
