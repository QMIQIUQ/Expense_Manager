import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ScheduledPayment, 
  ScheduledPaymentRecord, 
  Category,
  PaymentMethodType 
} from '../../types';
import { getTodayLocal } from '../../utils/dateUtils';

interface BulkPaymentConfirmProps {
  scheduledPayments: ScheduledPayment[];
  paymentRecords: ScheduledPaymentRecord[];
  categories: Category[];
  onConfirmPayments: (paymentData: Array<{
    scheduledPaymentId: string;
    recordData: Omit<ScheduledPaymentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'scheduledPaymentId'>;
  }>) => void;
  onClose: () => void;
}

const BulkPaymentConfirm: React.FC<BulkPaymentConfirmProps> = ({
  scheduledPayments,
  paymentRecords,
  categories,
  onConfirmPayments,
  onClose,
}) => {
  const { t } = useLanguage();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Get pending payments (not yet paid this month)
  const pendingPayments = useMemo(() => {
    return scheduledPayments
      .filter(payment => payment.isActive && !payment.isCompleted)
      .filter(payment => {
        const isPaid = paymentRecords.some(
          record =>
            record.scheduledPaymentId === payment.id &&
            record.periodYear === currentYear &&
            record.periodMonth === currentMonth
        );
        return !isPaid;
      })
      .sort((a, b) => a.dueDay - b.dueDay);
  }, [scheduledPayments, paymentRecords, currentYear, currentMonth]);

  // Selected payments
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(pendingPayments.map(p => p.id!)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Get category color
  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6366f1';
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'subscription': return '🔄';
      case 'installment': return '📅';
      case 'debt': return '💳';
      default: return '📋';
    }
  };

  // Calculate total selected amount
  const totalSelectedAmount = useMemo(() => {
    return pendingPayments
      .filter(p => selectedIds.has(p.id!))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [pendingPayments, selectedIds]);

  const handleConfirmSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsConfirming(true);
    
    const paymentsToConfirm = pendingPayments
      .filter(p => selectedIds.has(p.id!))
      .map(payment => ({
        scheduledPaymentId: payment.id!,
        recordData: {
          expectedAmount: payment.amount,
          actualAmount: payment.amount,
          difference: 0,
          periodYear: currentYear,
          periodMonth: currentMonth,
          dueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(payment.dueDay).padStart(2, '0')}`,
          paidDate: getTodayLocal(),
          paymentMethod: payment.paymentMethod as PaymentMethodType | undefined,
          cardId: payment.cardId,
          paymentMethodName: payment.paymentMethodName,
          bankId: payment.bankId,
        },
      }));

    onConfirmPayments(paymentsToConfirm);
    setIsConfirming(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-xl shadow-xl"
        style={{ backgroundColor: 'var(--card-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              ✅ {t('bulkConfirm')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              style={{ color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>
          
          {/* Select All / Deselect All */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1 text-sm rounded-lg"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)' }}
              >
                {t('selectAll')}
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1 text-sm rounded-lg"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                {t('deselectAll')}
              </button>
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('selectedCount')}: {selectedIds.size}/{pendingPayments.length}
            </span>
          </div>
        </div>

        {/* Payment List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          {pendingPayments.length === 0 ? (
            <div className="p-8 text-center">
              <span className="text-4xl">✅</span>
              <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
                {t('noPendingPayments')}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {pendingPayments.map(payment => {
                const isSelected = selectedIds.has(payment.id!);
                const isOverdue = payment.dueDay < today.getDate();

                return (
                  <button
                    key={payment.id}
                    onClick={() => toggleSelect(payment.id!)}
                    className="w-full p-4 flex items-center gap-3 text-left transition-all"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                    }}
                  >
                    {/* Checkbox */}
                    <div 
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>

                    {/* Payment Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{getTypeIcon(payment.type)}</span>
                        <span 
                          className="font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {payment.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ 
                            backgroundColor: `${getCategoryColor(payment.category)}20`,
                            color: getCategoryColor(payment.category),
                          }}
                        >
                          {payment.category}
                        </span>
                        <span 
                          className="text-xs"
                          style={{ 
                            color: isOverdue ? 'var(--error-text)' : 'var(--text-secondary)',
                          }}
                        >
                          {isOverdue ? `⚠️ ${t('overdue')}` : `${t('dueDay')}: ${payment.dueDay}`}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <span 
                      className="font-semibold"
                      style={{ color: 'var(--error-text)' }}
                    >
                      ${payment.amount.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ color: 'var(--text-secondary)' }}>{t('totalAmount')}:</span>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              ${totalSelectedAmount.toFixed(2)}
            </span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-medium"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirmSelected}
              disabled={selectedIds.size === 0 || isConfirming}
              className="flex-1 py-3 rounded-lg font-medium transition-all"
              style={{ 
                backgroundColor: selectedIds.size === 0 ? 'var(--bg-secondary)' : 'var(--success-bg)',
                color: selectedIds.size === 0 ? 'var(--text-secondary)' : 'var(--success-text)',
                opacity: isConfirming ? 0.5 : 1,
              }}
            >
              {isConfirming ? t('loading') : `${t('confirmSelected')} (${selectedIds.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkPaymentConfirm;
