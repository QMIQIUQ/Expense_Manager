import { useEffect, useState } from 'react';
import { convertAmountToCurrency } from '../services/currencyRateService';
import { normalizeCurrencyCode } from '../utils/currencyUtils';

export interface CurrencyConversionEntry {
  key: string;
  amount: number;
  sourceCurrency?: string | null;
  date: string;
}

export const useCurrencyConversionMap = (
  entries: CurrencyConversionEntry[],
  targetCurrency?: string | null
): Record<string, number> => {
  const [amountsByKey, setAmountsByKey] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    const resolveConversions = async () => {
      if (!targetCurrency) {
        if (!cancelled) {
          setAmountsByKey({});
        }
        return;
      }

      const target = normalizeCurrencyCode(targetCurrency);
      const nextMap: Record<string, number> = {};
      await Promise.all(entries.map(async (entry) => {
        try {
          if (normalizeCurrencyCode(entry.sourceCurrency) === target) {
            nextMap[entry.key] = Math.round(entry.amount * 100) / 100;
            return;
          }

          nextMap[entry.key] = await convertAmountToCurrency(
            entry.amount,
            entry.sourceCurrency ?? undefined,
            targetCurrency ?? undefined,
            entry.date
          );
        } catch (error) {
          console.error('Failed to convert currency amount:', error);
          nextMap[entry.key] = entry.amount;
        }
      }));

      if (!cancelled) {
        setAmountsByKey(nextMap);
      }
    };

    void resolveConversions();

    return () => {
      cancelled = true;
    };
  }, [entries, targetCurrency]);

  return amountsByKey;
};
