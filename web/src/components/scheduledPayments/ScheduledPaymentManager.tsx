import React, { useState, useEffect } from 'react';
import { 
  ScheduledPayment, 
  ScheduledPaymentRecord,
  ScheduledPaymentSummary,
  Category, 
  Card, 
  Bank,
  EWallet
} from '../../types';
import ConfirmModal from '../ConfirmModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlusIcon } from '../icons';
import ScheduledPaymentForm from './ScheduledPaymentForm';
import ScheduledPaymentCard from './ScheduledPaymentCard';
import { SearchBar } from '../common/SearchBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { MultiSelectToolbar } from '../common/MultiSelectToolbar';

// Responsive styles
const responsiveStyles = `
  .desktop-actions {
    display: none;
    gap: 8px;
  }
  .mobile-actions {
    display: block;
  }
  @media (min-width: 640px) {
    .desktop-actions {
      display: flex;
    }
    .mobile-actions {
      display: none;
    }
  }
`;

interface ScheduledPaymentManagerProps {
  scheduledPayments: ScheduledPayment[];
  paymentRecords: ScheduledPaymentRecord[];
  categories: Category[];
  banks?: Bank[];
  cards?: Card[];
  ewallets?: EWallet[];
  onAdd: (payment: Omit<ScheduledPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<ScheduledPayment>) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onConfirmPayment: (scheduledPaymentId: string, record: Omit<ScheduledPaymentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'scheduledPaymentId'>) => void;
  onDeletePaymentRecord: (recordId: string) => void;
  getSummary: (payment: ScheduledPayment) => Promise<ScheduledPaymentSummary>;
  isPeriodPaid: (paymentId: string, year: number, month: number) => Promise<boolean>;
}

const ScheduledPaymentManager: React.FC<ScheduledPaymentManagerProps> = ({
  scheduledPayments,
  paymentRecords,
  categories,
  banks = [],
  cards = [],
  ewallets = [],
  onAdd,
  onUpdate,
  onDelete,
  onToggleActive,
  onConfirmPayment,
  onDeletePaymentRecord,
  getSummary,
  isPeriodPaid,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [summaries, setSummaries] = useState<{ [id: string]: ScheduledPaymentSummary }>({});
  const [periodPaidStatus, setPeriodPaidStatus] = useState<{ [id: string]: boolean }>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; paymentId: string | null }>({
    isOpen: false,
    paymentId: null,
  });

  // Load summaries for all payments
  useEffect(() => {
    const loadSummaries = async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;

      for (const payment of scheduledPayments) {
        if (payment.id) {
          try {
            const summary = await getSummary(payment);
            setSummaries(prev => ({ ...prev, [payment.id!]: summary }));
            
            const isPaid = await isPeriodPaid(payment.id, currentYear, currentMonth);
            setPeriodPaidStatus(prev => ({ ...prev, [payment.id!]: isPaid }));
          } catch (error) {
            console.error('Error loading summary for payment:', payment.id, error);
          }
        }
      }
    };

    if (scheduledPayments.length > 0) {
      loadSummaries();
    }
  }, [scheduledPayments, getSummary, isPeriodPaid]);

  // Filter payments
  const filteredPayments = scheduledPayments.filter((payment) => {
    const matchesSearch = payment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesType = filterType === 'all' || payment.type === filterType;
    return matchesSearch && matchesType;
  });

  const {
    isSelectionMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setIsSelectionMode
  } = useMultiSelect<ScheduledPayment>();

  // Get payment records for a specific scheduled payment
  const getRecordsForPayment = (paymentId: string) => {
    return paymentRecords.filter(r => r.scheduledPaymentId === paymentId);
  };

  const handleAddSubmit = (data: Omit<ScheduledPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    onAdd(data);
    setIsAdding(false);
  };

  const handleEditSubmit = (data: Partial<ScheduledPayment>) => {
    if (editingId) {
      onUpdate(editingId, data);
      setEditingId(null);
    }
  };

  const handleConfirmPayment = (paymentId: string, recordData: {
    expectedAmount: number;
    actualAmount: number;
    difference: number;
    periodYear: number;
    periodMonth: number;
    dueDate: string;
    paidDate: string;
    paymentMethod?: string;
    cardId?: string;
    paymentMethodName?: string;
    bankId?: string;
    note?: string;
  }) => {
    onConfirmPayment(paymentId, {
      expectedAmount: recordData.expectedAmount,
      actualAmount: recordData.actualAmount,
      difference: recordData.difference,
      periodYear: recordData.periodYear,
      periodMonth: recordData.periodMonth,
      dueDate: recordData.dueDate,
      paidDate: recordData.paidDate,
      paymentMethod: recordData.paymentMethod as 'cash' | 'credit_card' | 'e_wallet' | 'bank' | undefined,
      cardId: recordData.cardId,
      paymentMethodName: recordData.paymentMethodName,
      bankId: recordData.bankId,
      note: recordData.note,
    });
    
    // Update period paid status
    setPeriodPaidStatus(prev => ({ ...prev, [paymentId]: true }));
  };

  return (
    <div style={styles.container}>
      <style>{responsiveStyles}</style>
      
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>{t('scheduledPayments')}</h2>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <PlusIcon size={18} />
            <span>{t('addScheduledPayment')}</span>
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="mb-5">
          <ScheduledPaymentForm
            categories={categories}
            cards={cards}
            banks={banks}
            ewallets={ewallets}
            onSubmit={(data) => {
              handleAddSubmit({
                name: data.name,
                description: data.description || undefined,
                category: data.category,
                type: data.type,
                amount: data.amount,
                totalAmount: data.totalAmount || undefined,
                interestRate: data.interestRate || undefined,
                frequency: data.frequency,
                dueDay: data.dueDay,
                startDate: data.startDate,
                endDate: data.endDate || undefined,
                totalInstallments: data.totalInstallments || undefined,
                paymentMethod: data.paymentMethod || undefined,
                cardId: data.cardId || undefined,
                paymentMethodName: data.paymentMethodName || undefined,
                bankId: data.bankId || undefined,
                isActive: data.isActive,
              });
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {/* Search and Filter */}
      <div style={styles.searchContainer}>
        <SearchBar
          placeholder={t('searchByName') || 'Search by name...'}
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="all">{t('allTypes')}</option>
          <option value="subscription">🔄 {t('subscription')}</option>
          <option value="installment">📅 {t('installment')}</option>
          <option value="debt">💳 {t('debt')}</option>
        </select>
      </div>

      {/* Multi-Select Toolbar */}
      <MultiSelectToolbar
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.size}
        onToggleSelectionMode={() => {
          if (isSelectionMode) {
            clearSelection();
            setIsSelectionMode(false);
          } else {
            setIsSelectionMode(true);
          }
        }}
        onSelectAll={() => selectAll(filteredPayments)}
        onDeleteSelected={() => {
          if (selectedIds.size > 0) {
            setDeleteConfirm({ isOpen: true, paymentId: null });
          }
        }}
      />

      {/* Payment List */}
      <div style={styles.paymentList}>
        {filteredPayments.length === 0 ? (
          <div style={styles.noData}>
            <p>{scheduledPayments.length === 0 ? t('noScheduledPaymentsYet') : t('noResults')}</p>
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <div 
              key={payment.id} 
              className={isSelectionMode && selectedIds.has(payment.id!) ? 'selected' : ''}
              style={{ position: 'relative' }}
            >
              {isSelectionMode && (
                <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(payment.id!)}
                    onChange={() => toggleSelection(payment.id!)}
                    className="multi-select-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              
              {editingId === payment.id ? (
                <ScheduledPaymentForm
                  initialData={{
                    name: payment.name,
                    description: payment.description || '',
                    category: payment.category,
                    type: payment.type,
                    amount: payment.amount,
                    totalAmount: payment.totalAmount || 0,
                    interestRate: payment.interestRate || 0,
                    frequency: payment.frequency,
                    dueDay: payment.dueDay,
                    startDate: payment.startDate,
                    endDate: payment.endDate || '',
                    totalInstallments: payment.totalInstallments || 12,
                    paymentMethod: payment.paymentMethod || 'cash',
                    cardId: payment.cardId || '',
                    paymentMethodName: payment.paymentMethodName || '',
                    bankId: payment.bankId || '',
                    isActive: payment.isActive,
                  }}
                  categories={categories}
                  cards={cards}
                  banks={banks}
                  ewallets={ewallets}
                  onSubmit={(data) => {
                    handleEditSubmit({
                      name: data.name,
                      description: data.description || undefined,
                      category: data.category,
                      type: data.type,
                      amount: data.amount,
                      totalAmount: data.totalAmount || undefined,
                      interestRate: data.interestRate || undefined,
                      frequency: data.frequency,
                      dueDay: data.dueDay,
                      startDate: data.startDate,
                      endDate: data.endDate || undefined,
                      totalInstallments: data.totalInstallments || undefined,
                      paymentMethod: data.paymentMethod || undefined,
                      cardId: data.cardId || undefined,
                      paymentMethodName: data.paymentMethodName || undefined,
                      bankId: data.bankId || undefined,
                      isActive: data.isActive,
                    });
                  }}
                  onCancel={() => setEditingId(null)}
                  isEditing={true}
                />
              ) : (
                <ScheduledPaymentCard
                  payment={payment}
                  summary={summaries[payment.id!]}
                  records={getRecordsForPayment(payment.id!)}
                  categories={categories}
                  cards={cards}
                  banks={banks}
                  ewallets={ewallets}
                  onEdit={() => setEditingId(payment.id!)}
                  onDelete={() => setDeleteConfirm({ isOpen: true, paymentId: payment.id! })}
                  onToggleActive={(isActive) => onToggleActive(payment.id!, isActive)}
                  onConfirmPayment={(data) => handleConfirmPayment(payment.id!, data)}
                  onDeletePaymentRecord={onDeletePaymentRecord}
                  isPeriodPaid={periodPaidStatus[payment.id!] || false}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('deleteScheduledPayment')}
        message={deleteConfirm.paymentId ? t('confirmDeleteScheduledPayment') : t('confirmDeleteSelected')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.paymentId) {
            onDelete(deleteConfirm.paymentId);
          } else if (isSelectionMode) {
            selectedIds.forEach(id => onDelete(id));
            clearSelection();
            setIsSelectionMode(false);
          }
          setDeleteConfirm({ isOpen: false, paymentId: null });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, paymentId: null })}
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: 'var(--text-primary)',
  },
  searchContainer: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  noData: {
    textAlign: 'center' as const,
    padding: '40px',
    color: 'var(--text-secondary)',
  },
  paymentList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
};

export default ScheduledPaymentManager;
