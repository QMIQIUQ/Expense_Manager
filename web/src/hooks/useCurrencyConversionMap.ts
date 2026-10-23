import { useEffect, useMemo, useRef, useState } from 'react';
import { convertAmountShared, peekConvertedAmount } from '../services/sharedCurrencyConversion';
import { roundMoney } from '../domain/money';
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
  entries: CurrencyConversionEntry[], targetCurrency?: string | null, fallbackToSource = false,
): CurrencyConversionMapState => {
  const stableEntries = useRef(entries);
  const previous = stableEntries.current;
  if (previous.length !== entries.length || entries.some((entry, index) => {
    const old = previous[index];
    return !old || old.key !== entry.key || !Object.is(old.amount, entry.amount) || old.sourceCurrency !== entry.sourceCurrency || old.date !== entry.date || old.targetCurrency !== entry.targetCurrency;
  })) stableEntries.current = entries;
  entries = stableEntries.current;
  const [storedState, setStoredState] = useState<StoredCurrencyConversionMapState>();
  const immediate = useMemo(() => {
    const amountsByKey: Record<string, number> = {};
    let missing = false;
    for (const entry of entries) {
      const target = entry.targetCurrency ? normalizeCurrencyCode(entry.targetCurrency)
        : targetCurrency ? normalizeCurrencyCode(targetCurrency) : null;
      if (!target) continue;
      const source = normalizeCurrencyCode(entry.sourceCurrency);
      const value = source === target && Number.isFinite(entry.amount) ? roundMoney(entry.amount, target)
        : peekConvertedAmount(entry.amount, entry.sourceCurrency ?? undefined, target, entry.date);
      if (value !== undefined) amountsByKey[entry.key] = value; else missing = true;
    }
    return { amountsByKey, failedKeys: [] as string[], isLoading: missing };
  }, [entries, targetCurrency]);

  useEffect(() => {
    // Same-currency and already resolved values need no asynchronous state churn.
    if (!immediate.isLoading) return;
    let active = true;
    setStoredState({ ...immediate, entries, targetCurrency, fallbackToSource });
    const amountsByKey = { ...immediate.amountsByKey };
    const failedKeys: string[] = [];
    const resolveEntry = async (entry: CurrencyConversionEntry) => {
      if (Object.prototype.hasOwnProperty.call(amountsByKey, entry.key)) return;
      const target = entry.targetCurrency ? normalizeCurrencyCode(entry.targetCurrency)
        : targetCurrency ? normalizeCurrencyCode(targetCurrency) : null;
      if (!target) return;
      try {
        amountsByKey[entry.key] = await convertAmountShared(entry.amount, entry.sourceCurrency ?? undefined, target, entry.date);
      } catch (error) {
        console.error('Failed to convert currency amount:', error);
        failedKeys.push(entry.key);
        if (fallbackToSource) amountsByKey[entry.key] = entry.amount;
      }
    };
    void (async () => {
      for (let offset = 0; offset < entries.length && active; offset += 64) {
        await Promise.all(entries.slice(offset, offset + 64).map(resolveEntry));
      }
    })().then(() => {
      if (active) setStoredState({ entries, targetCurrency, fallbackToSource, amountsByKey, failedKeys, isLoading: false });
    });
    return () => { active = false; };
  }, [entries, targetCurrency, fallbackToSource, immediate]);

  if (!immediate.isLoading) return immediate;
  return storedState?.entries === entries && storedState.targetCurrency === targetCurrency && storedState.fallbackToSource === fallbackToSource
    ? storedState : immediate;
};

export const useCurrencyConversionMap = (entries: CurrencyConversionEntry[], targetCurrency?: string | null): Record<string, number> =>
  useCurrencyConversionMapState(entries, targetCurrency, false).amountsByKey;
