import React, { useState } from 'react';
import { Repayment, Card, EWallet } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DeleteIcon, EditIcon, CheckIcon, CloseIcon } from '../icons';
import ConfirmModal from '../ConfirmModal';

interface RepaymentListProps {
  repayments: Repayment[];
  onDelete: (id: string) => void;
  onEdit: (repayment: Repayment) => void;
  onUpdate?: (id: string, data: Partial<Repayment>) => void;
  cards?: Card[];
  ewallets?: EWallet[];
  maxAmount?: number;
}

const RepaymentList: React.FC<RepaymentListProps> = ({
  repayments,
  onDelete,
  onEdit: _onEdit,
  onUpdate,
  cards = [],
  ewallets: _ewallets = [],
  maxAmount: _maxAmount,
}) => {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; repaymentId: string | null }>({
    isOpen: false,
    repaymentId: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Repayment>>({});

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, repaymentId: id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.repaymentId) {
      onDelete(deleteConfirm.repaymentId);
    }
    setDeleteConfirm({ isOpen: false, repaymentId: null });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, repaymentId: null });
  };

  const startInlineEdit = (repayment: Repayment) => {
    setEditingId(repayment.id!);
    // Convert amount to cents for editing
    setDraft({
      amount: repayment.amount ? Math.round(repayment.amount * 100) : 0,
      date: repayment.date,
      payerName: repayment.payerName || '',
      note: repayment.note || '',
      paymentMethod: repayment.paymentMethod || 'cash',
      cardId: repayment.cardId || '',
      paymentMethodName: repayment.paymentMethodName || '',
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveInlineEdit = (repayment: Repayment) => {
    if (!onUpdate || !repayment.id) return;
    
    // Convert amount from cents to dollars
    const updates: Partial<Repayment> = {};
    const amountInDollars = (draft.amount || 0) / 100;
    
    if (repayment.amount !== amountInDollars) updates.amount = amountInDollars;
    if (repayment.date !== draft.date) updates.date = draft.date!;
    if (repayment.payerName !== draft.payerName) updates.payerName = draft.payerName;
    if (repayment.note !== draft.note) updates.note = draft.note;
    if (repayment.paymentMethod !== draft.paymentMethod) updates.paymentMethod = draft.paymentMethod;
    if (repayment.cardId !== draft.cardId) updates.cardId = draft.cardId;
    if (repayment.paymentMethodName !== draft.paymentMethodName) updates.paymentMethodName = draft.paymentMethodName;

    if (Object.keys(updates).length > 0) {
      onUpdate(repayment.id, updates);
    }
    cancelInlineEdit();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '');
    const amountInCents = parseInt(digitsOnly) || 0;
    setDraft((d) => ({ ...d, amount: amountInCents }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get theme-aware payment chip style
  const getPaymentChipStyle = () => {
    if (effectiveTheme === 'dark') {
      return {
        ...styles.paymentChip,
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.25) 100%)',
        color: '#86efac',
        boxShadow: '0 1px 3px rgba(34, 197, 94, 0.2)',
      };
    }
    return styles.paymentChip;
  };

  // Get theme-aware amount style
  const getAmountStyle = () => {
    if (effectiveTheme === 'dark') {
      return {
        ...styles.amount,
        color: '#86efac',
        textShadow: '0 1px 2px rgba(134, 239, 172, 0.2)',
      };
    }
    return styles.amount;
  };

  // Get theme-aware payer name style
  const getPayerNameStyle = () => {
    if (effectiveTheme === 'dark') {
      return {
        ...styles.payerName,
        color: 'var(--text-primary)',
      } as React.CSSProperties;
    }
    return styles.payerName as React.CSSProperties;
  };

  // Get theme-aware date style
  const getDateStyle = () => {
    if (effectiveTheme === 'dark') {
      return {
        ...styles.date,
        color: 'var(--text-secondary)',
      } as React.CSSProperties;
    }
    return styles.date as React.CSSProperties;
  };

  // Get theme-aware note text style
  const getNoteStyle = () => {
    if (effectiveTheme === 'dark') {
      return {
        ...styles.noteText,
        color: 'var(--text-secondary)',
      } as React.CSSProperties;
    }
    return styles.noteText as React.CSSProperties;
  };

  if (repayments.length === 0) {
    return (
      <div style={styles.noData}>
        <p>{t('noRepaymentsYet')}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {repayments.map((repayment) => (
          <div key={repayment.id} className="repayment-card" style={styles.repaymentCard}>
            {editingId === repayment.id ? (
              <div className="flex flex-col gap-4">
                {/* Amount and Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t('repaymentAmount')} ($) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={((draft.amount || 0) / 100).toFixed(2)}
                      onChange={handleAmountChange}
                      onFocus={(e) => e.target.select()}
                      placeholder="0.00"
                      className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t('date')} *
                    </label>
                    <input
                      type="date"
                      value={draft.date || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                      className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>

                {/* Payment Method and Card/Wallet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t('paymentMethod')}
                    </label>
                    <select
                      value={draft.paymentMethod || 'cash'}
                      onChange={(e) => {
                        const method = e.target.value as Repayment['paymentMethod'];
                        setDraft((d) => ({
                          ...d,
                          paymentMethod: method,
                          cardId: method === 'credit_card' ? d.cardId : '',
                          paymentMethodName: method === 'e_wallet' ? d.paymentMethodName : '',
                        }));
                      }}
                      className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="cash">💵 {t('cash')}</option>
                      <option value="credit_card">💳 {t('creditCard')}</option>
                      <option value="e_wallet">📱 {t('eWallet')}</option>
                    </select>
                  </div>

                  {draft.paymentMethod === 'credit_card' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {t('selectCard')}
                      </label>
                      <select
                        value={draft.cardId || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, cardId: e.target.value }))}
                        className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        style={{
                          borderColor: 'var(--border-color)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="">{t('selectCard')}</option>
                        {cards.map((card) => (
                          <option key={card.id} value={card.id}>
                            💳 {card.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {draft.paymentMethod === 'e_wallet' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {t('eWalletNameLabel')}
                      </label>
                      <input
                        type="text"
                        value={draft.paymentMethodName || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, paymentMethodName: e.target.value }))}
                        placeholder={t('eWalletNameLabel') || 'E-wallet name'}
                        onFocus={(e) => e.target.select()}
                        className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        style={{
                          borderColor: 'var(--border-color)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Payer Name (full width) */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {t('payerName') || 'Payer Name'}
                  </label>
                  <input
                    type="text"
                    value={draft.payerName || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, payerName: e.target.value }))}
                    placeholder={t('payerName') || 'Who paid'}
                    onFocus={(e) => e.target.select()}
                    className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Note (full width) */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {t('notes')}
                  </label>
                  <textarea
                    value={draft.note || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                    placeholder={t('notesOptional')}
                    onFocus={(e) => e.target.select()}
                    className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      minHeight: '80px',
                      resize: 'vertical' as const
                    }}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-2 justify-end">
                  <button
                    onClick={() => saveInlineEdit(repayment)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: 'var(--accent-light)',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                    aria-label={t('save')}
                  >
                    <CheckIcon size={18} />
                  </button>
                  <button
                    onClick={cancelInlineEdit}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                    aria-label={t('cancel')}
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* First row: Date, Payment Method Chip, Amount */}
                <div style={styles.repaymentRow1}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={getDateStyle()}>{formatDate(repayment.date)}</span>
                    {/* Payment Method Chip */}
                    <span style={getPaymentChipStyle()}>
                      {repayment.paymentMethod === 'credit_card' && `💳 ${t('creditCard')}`}
                      {repayment.paymentMethod === 'e_wallet' && `📱 ${repayment.paymentMethodName || t('eWallet')}`}
                      {(!repayment.paymentMethod || repayment.paymentMethod === 'cash') && `💵 ${t('cash')}`}
                    </span>
                  </div>
                  <div style={getAmountStyle()}>${repayment.amount.toFixed(2)}</div>
                </div>

                {/* Second row: Payer Name */}
                {repayment.payerName && (
                  <div style={styles.repaymentRow2}>
                    <span style={getPayerNameStyle()}>{repayment.payerName}</span>
                  </div>
                )}

                {/* Third row: Note, Edit, Delete */}
                <div style={styles.repaymentRow3}>
                  <div style={{ flex: 1 }}>
                    {repayment.note && (
                      <span style={getNoteStyle()}>{repayment.note}</span>
                    )}
                  </div>
                  <div style={styles.actions}>
                    <button
                      onClick={() => startInlineEdit(repayment)}
                      className="btn-icon btn-icon-primary"
                      aria-label="Edit repayment"
                      title={t('edit')}
                    >
                      <EditIcon size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(repayment.id!)}
                      className="btn-icon btn-icon-danger"
                      aria-label="Delete repayment"
                      title={t('delete')}
                    >
                      <DeleteIcon size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={t('delete') + ' ' + t('repayments')}
        message={t('confirmDeleteRepayment')}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  repaymentCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    boxShadow: '0 2px 8px var(--shadow)',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  repaymentRow1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  repaymentRow2: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '2px',
  },
  repaymentRow3: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  paymentChip: {
    padding: '4px 10px',
    background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    color: '#15803d',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600' as const,
    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.15)',
  },
  amount: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#16a34a',
    whiteSpace: 'nowrap' as const,
    textShadow: '0 1px 2px rgba(22, 163, 74, 0.1)',
  },
  date: {
    fontSize: '0.9rem',
    color: '#666',
  },
  payerName: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#333',
  },
  noteText: {
    fontSize: '0.9rem',
    color: '#666',
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  noData: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#999',
  },
};

export default RepaymentList;
