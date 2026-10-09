import React, { useMemo } from 'react';
import type { CurrencyCode } from '../../types';
import { useCurrencyConversionMapState } from '../../hooks/useCurrencyConversionMap';
import { formatMoney, normalizeCurrencyCode } from '../../utils/currencyUtils';
import { useLanguage } from '../../contexts/LanguageContext';

interface CurrencyAmountProps {
  amount: number;
  currency?: string | null;
  targetCurrency?: CurrencyCode | null;
  date?: string;
  showSource?: boolean;
}

/** Shared display for amounts that may need conversion; never labels source value as target currency. */
const CurrencyAmount: React.FC<CurrencyAmountProps> = ({
  amount,
  currency,
  targetCurrency,
  date = new Date().toISOString().slice(0, 10),
  showSource = false,
}) => {
  const { t } = useLanguage();
  const sourceCurrency = normalizeCurrencyCode(currency);
  const entry = useMemo(() => [{ key: 'value', amount, sourceCurrency, date }], [amount, sourceCurrency, date]);
  const conversion = useCurrencyConversionMapState(entry, targetCurrency, false);

  if (!targetCurrency || sourceCurrency === targetCurrency) return <>{formatMoney(amount, sourceCurrency)}</>;
  if (conversion.isLoading) return <>{formatMoney(amount, sourceCurrency)} → …</>;
  const converted = conversion.amountsByKey.value;
  if (!Number.isFinite(converted)) return <>{formatMoney(amount, sourceCurrency)} <span title={t('exchangeRateLookupFailed') || 'Exchange rate unavailable'}>({t('conversionUnavailable') || 'conversion unavailable'})</span></>;
  return <>{formatMoney(converted, targetCurrency)}{showSource && <> <small>({formatMoney(amount, sourceCurrency)})</small></>}</>;
};

export default CurrencyAmount;
