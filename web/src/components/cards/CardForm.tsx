import React, { useState } from 'react';
import { Card, CardType, CashbackRule, Category, Bank } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { BaseForm } from '../common/BaseForm';

interface CardFormProps {
  onSubmit: (card: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  initialData?: Card;
  categories: Category[];
  banks?: Bank[];
  title?: string;
}

// Simple Tooltip Component
const Tooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 text-xs border rounded-full transition-colors"
        style={{
          color: 'var(--text-secondary)',
          borderColor: 'var(--border-color)',
        }}
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
        <div 
          className="absolute z-10 w-64 p-2 text-xs rounded shadow-lg -top-2 left-6"
          style={{
            backgroundColor: 'var(--modal-bg)',
            color: 'var(--text-primary)',
          }}
        >
          {text}
          <div 
            className="absolute w-2 h-2 transform rotate-45 -left-1 top-3"
            style={{ backgroundColor: 'var(--modal-bg)' }}
          ></div>
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
  banks,
  title,
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    bankName: initialData?.bankName || '',
    cardLimit: initialData?.cardLimit ? Math.round(initialData.cardLimit * 100) : 0, // Store in cents
    billingDay: initialData?.billingDay || 1,
    benefitMinSpend: initialData?.benefitMinSpend ? Math.round(initialData.benefitMinSpend * 100) : 0, // Store in cents
    cardType: initialData?.cardType || ('cashback' as CardType),
  });

  const [cashbackRules, setCashbackRules] = useState<CashbackRule[]>(
    initialData?.cashbackRules?.map(rule => ({
      ...rule,
      minSpendForRate: Math.round(rule.minSpendForRate * 100),
      capIfMet: Math.round(rule.capIfMet * 100),
      capIfNotMet: Math.round(rule.capIfNotMet * 100),
    })) || []
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);
  const [bankSuggestions, setBankSuggestions] = useState<string[]>([]);

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

    // Build card data, omitting undefined fields to avoid Firebase errors
    const cardData: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
      name: formData.name,
      cardLimit: formData.cardLimit / 100, // Convert from cents to dollars
      billingDay: formData.billingDay,
      cardType: formData.cardType,
    };

    // Only add optional fields if they have values
    if (formData.bankName) {
      cardData.bankName = formData.bankName;
    }
    if (formData.benefitMinSpend && formData.benefitMinSpend > 0) {
      cardData.benefitMinSpend = formData.benefitMinSpend / 100; // Convert from cents to dollars
    }
    if (formData.cardType === 'cashback' && cashbackRules.length > 0) {
      // Convert cashback rules from cents to dollars
      cardData.cashbackRules = cashbackRules.map(rule => ({
        ...rule,
        minSpendForRate: rule.minSpendForRate / 100,
        capIfMet: rule.capIfMet / 100,
        capIfNotMet: rule.capIfNotMet / 100,
      }));
    }
    if (initialData?.perMonthOverrides && initialData.perMonthOverrides.length > 0) {
      cardData.perMonthOverrides = initialData.perMonthOverrides;
    }

    onSubmit(cardData);
  };

  const handleAmountChange = (fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    // Convert to integer (cents)
    const amountInCents = parseInt(digitsOnly) || 0;
    setFormData((prev) => ({
      ...prev,
      [fieldName]: amountInCents,
    }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'billingDay' ? parseInt(value) || 0 : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBankNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, bankName: value }));
    
    // Get bank name suggestions from localStorage (previously saved cards)
    if (value.length > 0) {
      if (banks && banks.length > 0) {
        const filtered = banks.map(b => b.name).filter((bName) => bName.toLowerCase().includes(value.toLowerCase()));
        setBankSuggestions(filtered);
        setShowBankSuggestions(filtered.length > 0);
      } else {
        const savedBanks = localStorage.getItem('cardBankNames');
        if (savedBanks) {
          try {
            const banksList: string[] = JSON.parse(savedBanks);
            const filtered = banksList.filter((bankName) => bankName.toLowerCase().includes(value.toLowerCase()));
            setBankSuggestions(filtered);
            setShowBankSuggestions(filtered.length > 0);
          } catch (error) {
            console.error('Error parsing bank names:', error);
          }
        }
      }
    } else {
      setShowBankSuggestions(false);
    }
  };

  const handleSelectBankSuggestion = (bankName: string) => {
    setFormData((prev) => ({ ...prev, bankName }));
    setShowBankSuggestions(false);
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

  const handleCashbackAmountChange = (index: number, field: 'minSpendForRate' | 'capIfMet' | 'capIfNotMet') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '');
    const amountInCents = parseInt(digitsOnly) || 0;
    handleCashbackRuleChange(index, field, amountInCents);
  };

  // Calculate how much spending needed to reach cap for display
  const calculateSpendToReachCap = (rate: number, capInCents: number): number => {
    if (rate === 0) return 0;
    const capInDollars = capInCents / 100;
    return Math.ceil(capInDollars / rate);
  };

  return (
    <BaseForm
      title={title || (initialData ? t('editCard') : t('addCard'))}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={initialData ? t('save') : t('addCard')}
    >
      {/* Card Name and Bank Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('cardName')} *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            placeholder="e.g., Chase Freedom, Amex Gold"
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 transition-colors ${
              errors.name ? 'border-red-500' : ''
            }`}
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: errors.name ? '#ef4444' : 'var(--border-color)',
            }}
          />
          {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
        </div>

        <div className="flex flex-col gap-1 relative">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('bankName')}</label>
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleBankNameChange}
            onFocus={(e) => e.target.select()}
            onBlur={() => setTimeout(() => setShowBankSuggestions(false), 200)}
            placeholder="e.g., Chase, Citibank, HSBC"
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)',
            }}
          />
          {showBankSuggestions && bankSuggestions.length > 0 && (
            <div 
              className="absolute z-10 w-full mt-1 border rounded shadow-lg top-full max-h-40 overflow-y-auto"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
              }}
            >
              {bankSuggestions.map((bank, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectBankSuggestion(bank)}
                  className="w-full px-3 py-2 text-left text-sm focus:outline-none transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {bank}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Limit and Billing Day */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('cardLimit')} ($) *</label>
          <input
            type="text"
            inputMode="numeric"
            name="cardLimit"
            value={(formData.cardLimit / 100).toFixed(2)}
            onChange={handleAmountChange('cardLimit')}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 transition-colors ${
              errors.cardLimit ? 'border-red-500' : ''
            }`}
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: errors.cardLimit ? '#ef4444' : 'var(--border-color)',
            }}
          />
          {errors.cardLimit && (
            <span className="text-xs text-red-600">{errors.cardLimit}</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('billingDay')} (1-28) *</label>
          <input
            type="number"
            name="billingDay"
            value={formData.billingDay}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            placeholder="25"
            min="1"
            max="28"
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 transition-colors ${
              errors.billingDay ? 'border-red-500' : ''
            }`}
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: errors.billingDay ? '#ef4444' : 'var(--border-color)',
            }}
          />
          {errors.billingDay && (
            <span className="text-xs text-red-600">{errors.billingDay}</span>
          )}
        </div>
      </div>

      {/* Benefit Min Spend and Card Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('benefitMinSpend')} ($)</label>
          <input
            type="text"
            inputMode="numeric"
            name="benefitMinSpend"
            value={(formData.benefitMinSpend / 100).toFixed(2)}
            onChange={handleAmountChange('benefitMinSpend')}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)',
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('cardType')} *</label>
          <select
            name="cardType"
            value={formData.cardType}
            onChange={handleChange}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)',
            }}
          >
            <option value="cashback">{t('cashback')}</option>
            <option value="points">{t('points')}</option>
          </select>
        </div>
      </div>

      {/* Cashback Rules (only for cashback type) */}
      {formData.cardType === 'cashback' && (
        <div className="flex flex-col gap-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--icon-bg)' }}>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
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
            <p className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>No cashback rules yet. Add one to get started!</p>
          )}

          {cashbackRules.map((rule, index) => (
            <div 
              key={rule.id || index} 
              className="p-3 border rounded-lg"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Rule {index + 1}</span>
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
                  <label className="text-xs font-medium flex items-center" style={{ color: 'var(--text-secondary)' }}>
                    {t('linkedCategory')} *
                    <Tooltip text={t('tooltipLinkedCategory')} />
                  </label>
                  <select
                    value={rule.linkedCategoryId}
                    onChange={(e) =>
                      handleCashbackRuleChange(index, 'linkedCategoryId', e.target.value)
                    }
                    className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)',
                    }}
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
                  <label className="text-xs font-medium flex items-center" style={{ color: 'var(--text-secondary)' }}>
                    {t('minSpendForRate')} ($)
                    <Tooltip text={t('tooltipMinSpendForRate')} />
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={(rule.minSpendForRate / 100).toFixed(2)}
                    onChange={handleCashbackAmountChange(index, 'minSpendForRate')}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)',
                    }}
                  />
                </div>

                {/* Rate if Met */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center" style={{ color: 'var(--text-secondary)' }}>
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
                    className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)',
                    }}
                  />
                </div>

                {/* Cap if Met */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center" style={{ color: 'var(--text-secondary)' }}>
                    {t('capIfMet')} ($)
                    <Tooltip text={t('tooltipCapIfMet')} />
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={(rule.capIfMet / 100).toFixed(2)}
                    onChange={handleCashbackAmountChange(index, 'capIfMet')}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)',
                    }}
                  />
                </div>

                {/* Display: Spend to reach cap */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center" style={{ color: 'var(--text-tertiary)' }}>
                    {t('spendToReachCap')}
                    <Tooltip text={t('tooltipSpendToReachCap')} />
                  </label>
                  <div 
                    className="px-2 py-1.5 text-sm rounded" 
                    style={{
                      backgroundColor: 'var(--icon-bg)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    ${calculateSpendToReachCap(rule.rateIfMet, rule.capIfMet)}
                  </div>
                </div>

                {/* Rate if Not Met */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center" style={{ color: 'var(--text-secondary)' }}>
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
                    className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)',
                    }}
                  />
                </div>

                {/* Cap if Not Met */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center" style={{ color: 'var(--text-secondary)' }}>
                    {t('capIfNotMet')} ($)
                    <Tooltip text={t('tooltipCapIfNotMet')} />
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={(rule.capIfNotMet / 100).toFixed(2)}
                    onChange={handleCashbackAmountChange(index, 'capIfNotMet')}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Actions removed - handled by BaseForm */}
    </BaseForm>
  );
};

export default CardForm;
