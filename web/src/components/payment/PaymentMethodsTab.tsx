import React, { useState, useMemo } from 'react';
import { Card, EWallet, Category, Expense, Bank, Income, Transfer } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import CardManager from '../cards/CardManager';
import EWalletManager from '../ewallet/EWalletManager';
import BankManager from '../banks/BankManager';
import SubTabs from '../common/SubTabs';

interface PaymentMethodsTabProps {
  cards: Card[];
  ewallets: EWallet[];
  banks?: Bank[];
  categories: Category[];
  expenses: Expense[];
  incomes: Income[];
  transfers: Transfer[];
  onAddCard: (card: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateCard: (id: string, card: Partial<Card>) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
  onAddEWallet: (ewallet: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateEWallet: (id: string, ewallet: Partial<EWallet>) => Promise<void>;
  onDeleteEWallet: (id: string) => Promise<void>;
  onAddBank?: (bank: Omit<Bank, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateBank?: (id: string, bank: Partial<Bank>) => Promise<void>;
  onDeleteBank?: (id: string) => Promise<void>;
  onAddTransfer: (transfer: Omit<Transfer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteTransfer: (id: string) => Promise<void>;
}

type PaymentMethodView = 'cards' | 'ewallets' | 'banks';

const PaymentMethodsTab: React.FC<PaymentMethodsTabProps> = ({
  cards,
  ewallets,
  banks = [],
  categories,
  expenses,
  incomes,
  transfers,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onAddEWallet,
  onUpdateEWallet,
  onDeleteEWallet,
  onAddBank,
  onUpdateBank,
  onDeleteBank,
  onAddTransfer,
  onDeleteTransfer,
}) => {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<PaymentMethodView>('cards');
  
  // TODO: TransferList will use onDeleteTransfer and onAddTransfer
  void onDeleteTransfer;
  void onAddTransfer;

  const tabs = useMemo(() => [
    { id: 'cards', label: t('cards'), icon: '💳' },
    { id: 'ewallets', label: t('eWallets'), icon: '📱' },
    { id: 'banks', label: t('banks'), icon: '🏦' },
  ], [t]);

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      position: 'relative' as const,
    },
    content: {
      marginTop: '8px',
    },
  };

  return (
    <div style={styles.container}>
      {/* Sub-tab navigation */}
      <SubTabs
        tabs={tabs}
        activeTab={activeView}
        onTabChange={(tabId) => setActiveView(tabId as PaymentMethodView)}
      />

      {/* Content based on active view */}
      <div style={styles.content}>
        {activeView === 'cards' && (
          <CardManager
            cards={cards}
            banks={banks}
            categories={categories}
            expenses={expenses}
            onAdd={onAddCard}
            onUpdate={onUpdateCard}
            onDelete={onDeleteCard}
          />
        )}

        {activeView === 'ewallets' && (
          <EWalletManager
            ewallets={ewallets}
            categories={categories}
            expenses={expenses}
            incomes={incomes}
            transfers={transfers}
            onAdd={onAddEWallet}
            onUpdate={onUpdateEWallet}
            onDelete={onDeleteEWallet}
          />
        )}
        {activeView === 'banks' && (
          <div>
            {/* Lazy-load BankManager to avoid initial bundle weight if not enabled */}
            <React.Suspense fallback={<div>{t('loading')}</div>}>
              <BankManager
                banks={banks || []}
                expenses={expenses}
                incomes={incomes}
                transfers={transfers}
                onAdd={onAddBank!}
                onUpdate={onUpdateBank!}
                onDelete={onDeleteBank!}
              />
            </React.Suspense>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodsTab;
