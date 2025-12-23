import React from 'react';
import PopupModal from './PopupModal';

interface FormPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  maxWidth?: string;
}

/**
 * FormPopup - A popup modal wrapper specifically for forms
 * 
 * This component wraps the PopupModal to provide a consistent
 * form popup experience with the standardized UI layout:
 * 
 * ————————————
 * 標題                 x（關閉）
 * ————————————
 * 表單内容
 * ————————————
 * [確認/保存 80%] [取消 20%]
 * ————————————
 * 
 * Usage:
 * ```tsx
 * <FormPopup
 *   isOpen={isAdding}
 *   onClose={() => setIsAdding(false)}
 *   title="Add Category"
 *   onSubmit={handleSubmit}
 * >
 *   <FormFields />
 * </FormPopup>
 * ```
 */
const FormPopup: React.FC<FormPopupProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel,
  cancelLabel,
  submitDisabled = false,
  maxWidth = '500px',
}) => {
  return (
    <PopupModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      isForm={true}
      onSubmit={onSubmit}
      primaryButtonLabel={submitLabel}
      secondaryButtonLabel={cancelLabel}
      primaryButtonDisabled={submitDisabled}
      maxWidth={maxWidth}
    >
      <div style={styles.formContent}>
        {children}
      </div>
    </PopupModal>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  formContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
};

export default FormPopup;
