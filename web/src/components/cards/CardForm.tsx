import React, { useState } from 'react';
import { Card, CardType, CashbackRule, Category } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface CardFormProps {
  onSubmit: (card: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  initialData?: Card;
  categories: Category[];
}

// Simple Tooltip Component
const Tooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 hover:text-gray-700 border border-gray-400 rounded-full"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          setIsVisible(!isVisible);
        }}
      >
        ?
      </button>
      {isVisible && (
        <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-800 rounded shadow-lg -top-2 left-6">
          {text}
          <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 -left-1 top-3"></div>
        </div>
      )}
    </div>
  );
};

const CardForm: React.FC<CardFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  categories,
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cardLimit: initialData?.cardLimit || 0,
    billingDay: initialData?.billingDay || 1,
    benefitMinSpend: initialData?.benefitMinSpend || 0,
    cardType: initialData?.cardType || ('cashback' as CardType),
  });

  const [cashbackRules, setCashbackRules] = useState<CashbackRule[]>(
    initialData?.cashbackRules || []
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = t('pleaseFillField');
    if (!formData.cardLimit || formData.cardLimit <= 0) newErrors.cardLimit = t('pleaseFillField');
    if (formData.billingDay < 1 || formData.billingDay > 28) {
      newErrors.billingDay = 'Billing day must be between 1 and 28';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const cardData: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
      ...formData,
      cashbackRules: formData.cardType === 'cashback' ? cashbackRules : undefined,
      perMonthOverrides: initialData?.perMonthOverrides,
    };

    onSubmit(cardData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['cardLimit', 'billingDay', 'benefitMinSpend'].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddCashbackRule = () => {
    setCashbackRules((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        linkedCategoryId: '',
        minSpendForRate: 0,
        rateIfMet: 0,
        capIfMet: 0,
        rateIfNotMet: 0,
        capIfNotMet: 0,
      },
    ]);
  };

  const handleRemoveCashbackRule = (index: number) => {
    setCashbackRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCashbackRuleChange = (
    index: number,
    field: keyof CashbackRule,
    value: string | number
  ) => {
    setCashbackRules((prev) =>
      prev.map((rule, i) => {
        if (i !== index) return rule;
        return {
          ...rule,
          [field]: value,
        };
      })
    );
  };

  // Calculate how much spending needed to reach cap for display
  const calculateSpendToReachCap = (rate: number, cap: number): number => {
    if (rate === 0) return 0;
    return Math.ceil(cap / rate);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Card Name */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{t('cardName')} *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="e.g., Chase Freedom, Amex Gold"
          className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
      </div>

      {/* Card Limit */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{t('cardLimit')} ($) *</label>
        <input
          type="number"
          name="cardLimit"
          value={formData.cardLimit}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="10000"
          step="1"
          min="0"
          className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.cardLimit ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.cardLimit && (
          <span className="text-xs text-red-600">{errors.cardLimit}</span>
        )}
      </div>

      {/* Billing Day */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{t('billingDay')} (1-28) *</label>
        <input
          type="number"
          name="billingDay"
          value={formData.billingDay}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="25"
          min="1"
          max="28"
          className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.billingDay ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.billingDay && (
          <span className="text-xs text-red-600">{errors.billingDay}</span>
        )}
        <span className="text-xs text-gray-500">
          Regular billing day each month (1-28 for consistency)
        </span>
      </div>

      {/* Benefit Min Spend (Optional) */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{t('benefitMinSpend')}</label>
        <input
          type="number"
          name="benefitMinSpend"
          value={formData.benefitMinSpend}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="0"
          step="1"
          min="0"
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="text-xs text-gray-500">
          Overall minimum spend threshold for card benefits (optional)
        </span>
      </div>

      {/* Card Type */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{t('cardType')} *</label>
        <select
          name="cardType"
          value={formData.cardType}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="cashback">{t('cashback')}</option>
          <option value="points">{t('points')}</option>
        </select>
      </div>

      {/* Cashback Rules (only for cashback type) */}
      {formData.cardType === 'cashback' && (
        <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">
              {t('cashbackRules')}
            </label>
            <button
              type="button"
              onClick={handleAddCashbackRule}
              className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              + {t('addCashbackRule')}
            </button>
          </div>

          {cashbackRules.length === 0 && (
            <p className="text-sm text-gray-500 italic">No cashback rules yet. Add one to get started!</p>
          )}

          {cashbackRules.map((rule, index) => (
            <div key={rule.id || index} className="p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Rule {index + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCashbackRule(index)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  {t('delete')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Linked Category */}
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-medium text-gray-600 flex items-center">
                    {t('linkedCategory')} *
                    <Tooltip text={t('tooltipLinkedCategory')} />
                  </label>
                  <select
                    value={rule.linkedCategoryId}
                    onChange={(e) =>
                      handleCashbackRuleChange(index, 'linkedCategoryId', e.target.value)
                    }
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t('selectCategory')}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min Spend for Higher Rate */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center">
                    {t('minSpendForRate')} ($)
                    <Tooltip text={t('tooltipMinSpendForRate')} />
                  </label>
                  <input
                    type="number"
                    value={rule.minSpendForRate}
                    onChange={(e) =>
                      handleCashbackRuleChange(
                        index,
                        'minSpendForRate',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    step="1"
                    min="0"
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Rate if Met */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center">
                    {t('rateIfMet')}
                    <Tooltip text={t('tooltipRateIfMet')} />
                  </label>
                  <input
                    type="number"
                    value={rule.rateIfMet * 100}
                    onChange={(e) =>
                      handleCashbackRuleChange(
                        index,
                        'rateIfMet',
                        (parseFloat(e.target.value) || 0) / 100
                      )
                    }
                    onFocus={(e) => e.target.select()}
                    placeholder="8"
                    step="0.1"
                    min="0"
                    max="100"
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Cap if Met */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center">
                    {t('capIfMet')} ($)
                    <Tooltip text={t('tooltipCapIfMet')} />
                  </label>
                  <input
                    type="number"
                    value={rule.capIfMet}
                    onChange={(e) =>
                      handleCashbackRuleChange(
                        index,
                        'capIfMet',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    onFocus={(e) => e.target.select()}
                    placeholder="15"
                    step="1"
                    min="0"
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Display: Spend to reach cap */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 flex items-center">
                    {t('spendToReachCap')}
                    <Tooltip text={t('tooltipSpendToReachCap')} />
                  </label>
                  <div className="px-2 py-1.5 text-sm bg-gray-100 rounded text-gray-700">
                    ${calculateSpendToReachCap(rule.rateIfMet, rule.capIfMet)}
                  </div>
                </div>

                {/* Rate if Not Met */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center">
                    {t('rateIfNotMet')}
                    <Tooltip text={t('tooltipRateIfNotMet')} />
                  </label>
                  <input
                    type="number"
                    value={rule.rateIfNotMet * 100}
                    onChange={(e) =>
                      handleCashbackRuleChange(
                        index,
                        'rateIfNotMet',
                        (parseFloat(e.target.value) || 0) / 100
                      )
                    }
                    onFocus={(e) => e.target.select()}
                    placeholder="1"
                    step="0.1"
                    min="0"
                    max="100"
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Cap if Not Met */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center">
                    {t('capIfNotMet')} ($)
                    <Tooltip text={t('tooltipCapIfNotMet')} />
                  </label>
                  <input
                    type="number"
                    value={rule.capIfNotMet}
                    onChange={(e) =>
                      handleCashbackRuleChange(
                        index,
                        'capIfNotMet',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    onFocus={(e) => e.target.select()}
                    placeholder="5"
                    step="1"
                    min="0"
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90 transition-colors"
        >
          {t('save')}
        </button>
      </div>
    </form>
  );
};

export default CardForm;
