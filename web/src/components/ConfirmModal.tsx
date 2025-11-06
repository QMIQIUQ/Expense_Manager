import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onCancel(); // Close modal immediately
    setTimeout(() => onConfirm(), 0); // Execute in background
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] p-4" 
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h3 id="modal-title" className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-5">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <button 
            onClick={onCancel}
            className="px-5 py-2.5 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors min-h-[44px]"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2.5 text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors min-h-[44px] ${
              danger
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
