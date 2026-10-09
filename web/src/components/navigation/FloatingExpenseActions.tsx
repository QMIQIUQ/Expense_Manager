import React from 'react';
import { useLongPress } from '../../hooks/useLongPress';
import { PlusIcon, UploadIcon } from '../icons';

interface FloatingExpenseActionsProps {
  isMobile: boolean;
  addExpenseLabel: string;
  scanReceiptLabel: string;
  onAddExpense: () => void;
  onScanReceipt: () => void;
  onLongPress: (target: HTMLElement) => void;
}

const FloatingExpenseActions: React.FC<FloatingExpenseActionsProps> = ({
  isMobile,
  addExpenseLabel,
  scanReceiptLabel,
  onAddExpense,
  onScanReceipt,
  onLongPress,
}) => {
  const longPressHandlers = useLongPress({
    onLongPress,
    onClick: onAddExpense,
    delay: 500,
  });

  return (
    <div className={`floating-expense-actions ${isMobile ? 'is-mobile' : 'is-desktop'}`}>
      <button
        type="button"
        {...longPressHandlers}
        className="floating-expense-action floating-expense-action-primary floating-btn-hover"
        title={addExpenseLabel}
        aria-label={addExpenseLabel}
        onContextMenu={(event) => event.preventDefault()}
      >
        <PlusIcon size={isMobile ? 28 : 20} />
        {!isMobile && <span>{addExpenseLabel}</span>}
      </button>
      <button
        type="button"
        onClick={onScanReceipt}
        className="floating-expense-action floating-expense-action-secondary floating-btn-hover"
        title={scanReceiptLabel}
        aria-label={scanReceiptLabel}
        onContextMenu={(event) => event.preventDefault()}
      >
        <UploadIcon size={isMobile ? 24 : 18} />
        {!isMobile && <span>{scanReceiptLabel}</span>}
      </button>
    </div>
  );
};

export default FloatingExpenseActions;
