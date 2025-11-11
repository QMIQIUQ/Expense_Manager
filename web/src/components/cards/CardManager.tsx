import React, { useState } from 'react';
import { Card, Category, Expense, CardStats } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import CardForm from './CardForm';
import { calculateCardStats } from '../../utils/cardUtils';

interface CardManagerProps {
  cards: Card[];
  categories: Category[];
  expenses: Expense[];
  onAdd: (card: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Card>) => void;
  onDelete: (id: string) => void;
}

const CardManager: React.FC<CardManagerProps> = ({
  cards,
  categories,
  expenses,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const handleAdd = (cardData: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    onAdd(cardData);
    setIsAdding(false);
  };

  const handleUpdate = (cardData: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (editingId) {
      onUpdate(editingId, cardData);
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDeleteCard'))) {
      onDelete(id);
    }
  };

  const toggleExpand = (cardId: string) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">{t('creditCards')}</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          + {t('addCard')}
        </button>
      </div>

      {/* Add Card Form */}
      {isAdding && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-800 mb-4">{t('addCard')}</h3>
          <CardForm
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
            categories={categories}
          />
        </div>
      )}

      {/* Cards List */}
      {cards.length === 0 && !isAdding && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">{t('noCardsYet')}</p>
        </div>
      )}

      {cards.map((card) => {
        const isEditing = editingId === card.id;
        const isExpanded = expandedCardId === card.id;
        const stats: CardStats = calculateCardStats(card, expenses, categories);

        return (
          <div
            key={card.id}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            {isEditing ? (
              <>
                <h3 className="text-lg font-medium text-gray-800 mb-4">{t('editCard')}</h3>
                <CardForm
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingId(null)}
                  initialData={card}
                  categories={categories}
                />
              </>
            ) : (
              <>
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">{card.name}</h3>
                    <p className="text-sm text-gray-500">
                      {t('cardLimit')}: ${card.cardLimit.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(card.id!)}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(card.id!)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>

                {/* Card Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">{t('currentCycleSpending')}</p>
                    <p className="text-lg font-semibold text-blue-700">
                      ${stats.currentCycleSpending.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">{t('availableCredit')}</p>
                    <p className="text-lg font-semibold text-green-700">
                      ${stats.availableCredit.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">{t('estimatedCashback')}</p>
                    <p className="text-lg font-semibold text-purple-700">
                      ${stats.estimatedTotalCashback.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">{t('nextBillingDate')}</p>
                    <p className="text-lg font-semibold text-orange-700">
                      {stats.nextBillingDate}
                    </p>
                  </div>
                </div>

                {/* Toggle Details Button */}
                {card.cashbackRules && card.cashbackRules.length > 0 && (
                  <button
                    onClick={() => toggleExpand(card.id!)}
                    className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 border-t border-gray-200 flex items-center justify-center gap-2"
                  >
                    {isExpanded ? '▲' : '▼'} {t('cashbackBreakdown')}
                  </button>
                )}

                {/* Cashback Breakdown (Expanded) */}
                {isExpanded && card.cashbackRules && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="space-y-3">
                      {stats.cashbackByRule.map((ruleStats, index) => (
                        <div
                          key={ruleStats.ruleId || index}
                          className="p-3 bg-gray-50 rounded"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-700">
                              {ruleStats.categoryName}
                            </span>
                            <span className="text-sm font-semibold text-purple-600">
                              +${ruleStats.estimatedCashback.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>
                              {t('categorySpend')}: ${ruleStats.categorySpend.toFixed(2)}
                            </p>
                            {ruleStats.requiredToReachMinSpend > 0 && (
                              <p className="text-orange-600">
                                ${ruleStats.requiredToReachMinSpend.toFixed(2)} {t('toReachMinSpend')}
                              </p>
                            )}
                            {ruleStats.requiredToReachCap > 0 && (
                              <p className="text-blue-600">
                                ${ruleStats.requiredToReachCap.toFixed(2)} {t('toReachCap')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CardManager;
