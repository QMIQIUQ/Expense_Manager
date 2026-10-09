import { useEffect, useState } from 'react';
import { convertAmountToCurrency } from '../services/currencyRateService';
import { normalizeCurrencyCode } from '../utils/currencyUtils';

export interface CurrencyConversionEntry {
  key: string;
  amount: number;
  sourceCurrency?: string | null;
  date: string;
  targetCurrency?: string | null;
}

export interface CurrencyConversionMapState {
  amountsByKey: Record<string, number>;
  failedKeys: string[];
  isLoading: boolean;
}

interface StoredCurrencyConversionMapState extends CurrencyConversionMapState {
  entries: CurrencyConversionEntry[];
  targetCurrency?: string | null;
  fallbackToSource: boolean;
}

export const useCurrencyConversionMapState = (
  entries: CurrencyConversionEntry[],
  targetCurrency?: string | null,
  fallbackToSource = false,
): CurrencyConversionMapState => {
  const [storedState, setStoredState] = useState<StoredCurrencyConversionMapState>({
    entries: [],
    targetCurrency: null,
    fallbackToSource,
    amountsByKey: {},
    failedKeys: [],
    isLoading: false,
  });

  useEffect(() => {
    let cancelled = false;
    const hasTarget = Boolean(targetCurrency || entries.some((entry) => entry.targetCurrency));

    setStoredState({
      entries,
      targetCurrency,
      fallbackToSource,
      amountsByKey: {},
      failedKeys: [],
      isLoading: Boolean(hasTarget && entries.length > 0),
    });

    const resolveConversions = async () => {
      if (!hasTarget) {
        if (!cancelled) {
          setStoredState({
            entries,
            targetCurrency,
            fallbackToSource,
            amountsByKey: {},
            failedKeys: [],
            isLoading: false,
          });
        }
        return;
      }

      const nextMap: Record<string, number> = {};
      const failedKeys: string[] = [];
      await Promise.all(entries.map(async (entry) => {
        try {
          const entryTarget = entry.targetCurrency
            ? normalizeCurrencyCode(entry.targetCurrency)
            : targetCurrency ? normalizeCurrencyCode(targetCurrency) : null;
          if (!entryTarget) return;
          if (normalizeCurrencyCode(entry.sourceCurrency) === entryTarget) {
            nextMap[entry.key] = Math.round(entry.amount * 100) / 100;
            return;
          }

          nextMap[entry.key] = await convertAmountToCurrency(
            entry.amount,
            entry.sourceCurrency ?? undefined,
            entryTarget,
            entry.date
          );
        } catch (error) {
          console.error('Failed to convert currency amount:', error);
          failedKeys.push(entry.key);
          if (fallbackToSource) {
            nextMap[entry.key] = entry.amount;
          }
        }
      }));

      if (!cancelled) {
        setStoredState({
          entries,
          targetCurrency,
          fallbackToSource,
          amountsByKey: nextMap,
          failedKeys,
          isLoading: false,
        });
      }
    };

    void resolveConversions();

    return () => {
      cancelled = true;
    };
  }, [entries, targetCurrency, fallbackToSource]);

  if (
    storedState.entries !== entries ||
    storedState.targetCurrency !== targetCurrency ||
    storedState.fallbackToSource !== fallbackToSource
  ) {
    return {
      amountsByKey: {},
      failedKeys: [],
      isLoading: Boolean((targetCurrency || entries.some((entry) => entry.targetCurrency)) && entries.length > 0),
    };
  }

  return {
    amountsByKey: storedState.amountsByKey,
    failedKeys: storedState.failedKeys,
    isLoading: storedState.isLoading,
  };
};

export const useCurrencyConversionMap = (
  entries: CurrencyConversionEntry[],
  targetCurrency?: string | null
): Record<string, number> => {
  return useCurrencyConversionMapState(entries, targetCurrency, false).amountsByKey;
};
