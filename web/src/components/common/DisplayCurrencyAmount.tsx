import React from 'react';
import type { CurrencyCode } from '../../types';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import CurrencyAmount from './CurrencyAmount';

interface DisplayCurrencyAmountProps {
  amount: number;
  currency?: string | null;
  date?: string;
  showSource?: boolean;
  targetCurrency?: CurrencyCode;
}

/** Formats a stored amount using the user's shared display-currency preference. */
const DisplayCurrencyAmount: React.FC<DisplayCurrencyAmountProps> = ({
  amount,
  currency,
  date,
  showSource = false,
  targetCurrency,
}) => {
  const { displayCurrency } = useUserSettings();

  return (
    <CurrencyAmount
      amount={amount}
      currency={currency}
      targetCurrency={targetCurrency || displayCurrency}
      date={date}
      showSource={showSource}
    />
  );
};

export default DisplayCurrencyAmount;
