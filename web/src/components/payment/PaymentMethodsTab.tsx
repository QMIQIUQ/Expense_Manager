import React, { useState } from 'react';
import { Card, EWallet, Category, Expense } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import CardManager from '../cards/CardManager';
import EWalletManager from '../ewallet/EWalletManager';

interface PaymentMethodsTabProps {
  cards: Card[];
  ewallets: EWallet[];
  categories: Category[];
  expenses: Expense[];
  onAddCard: (card: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateCard: (id: string, card: Partial<Card>) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
  onAddEWallet: (ewallet: Omit<EWallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateEWallet: (id: string, ewallet: Partial<EWallet>) => Promise<void>;
  onDeleteEWallet: (id: string) => Promise<void>;
}

type PaymentMethodView = 'cards' | 'ewallets';

const PaymentMethodsTab: React.FC<PaymentMethodsTabProps> = ({
  cards,
  ewallets,
  categories,
  expenses,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onAddEWallet,
  onUpdateEWallet,
  onDeleteEWallet,
}) => {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<PaymentMethodView>('cards');

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    },
    tabs: {
      display: 'flex',
      gap: '8px',
      borderBottom: '1px solid var(--border-color)',
      marginBottom: '16px',
    },
    tab: (isActive: boolean) => ({
      padding: '8px 16px',
      fontWeight: 500,
      fontSize: '0.875rem',
      transition: 'all 0.2s',
      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
    }),
    content: {
      marginTop: '8px',
    }
  };

  return (
    <div style={styles.container}>
      {/* Sub-tab navigation */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveView('cards')}
          style={styles.tab(activeView === 'cards')}
        >
          💳 {t('cards')}
        </button>
        <button
          onClick={() => setActiveView('ewallets')}
          style={styles.tab(activeView === 'ewallets')}
        >
          📱 {t('eWallets')}
        </button>
      </div>

      {/* Content based on active view */}
      <div style={styles.content}>
        {activeView === 'cards' && (
          <CardManager
            cards={cards}
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
            onAdd={onAddEWallet}
            onUpdate={onUpdateEWallet}
            onDelete={onDeleteEWallet}
          />
        )}
      </div>
    </div>
  );
};

export default PaymentMethodsTab;
