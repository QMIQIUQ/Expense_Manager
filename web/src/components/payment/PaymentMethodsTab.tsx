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

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveView('cards')}
          className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${
            activeView === 'cards'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          💳 {t('cards')}
        </button>
        <button
          onClick={() => setActiveView('ewallets')}
          className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${
            activeView === 'ewallets'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          📱 {t('eWallets')}
        </button>
      </div>

      {/* Content based on active view */}
      <div className="mt-2">
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
