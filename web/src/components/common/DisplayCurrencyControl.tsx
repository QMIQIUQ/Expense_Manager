import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CurrencyCode } from '../../types';
import CurrencySelector from './CurrencySelector';

interface DisplayCurrencyControlProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
}

const DisplayCurrencyControl: React.FC<DisplayCurrencyControlProps> = ({ value, onChange, disabled = false }) => {
  const { t } = useLanguage();
  const label = t('displayCurrency');

  return (
    <div className="display-currency-control" style={styles.container}>
      <span className="display-currency-label" style={styles.label}>{label}</span>
      <div style={styles.selector}>
        <CurrencySelector
          value={value}
          onChange={onChange}
          disabled={disabled}
          compact={true}
          showLabel={false}
          align="right"
          ariaLabel={label}
          className="expense-display-currency-selector"
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: 'auto',
    flex: '0 1 auto',
    minWidth: 0,
    flexWrap: 'nowrap',
  },
  label: {
    flexShrink: 0,
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  },
  selector: {
    width: '100%',
    minWidth: 0,
    flex: '0 1 150px',
  },
};

export default DisplayCurrencyControl;
