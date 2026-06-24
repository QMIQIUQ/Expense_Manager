import React from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { CurrencyCode } from '../../types';
import { CURRENCIES, getCurrencyOption, normalizeCurrencyCode } from '../../utils/currencyUtils';
import { CheckIcon, ChevronDownIcon } from '../icons';

interface CurrencySelectorProps {
  value: CurrencyCode | string;
  onChange: (currency: CurrencyCode) => void;
  label?: string;
  showLabel?: boolean;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
  ariaLabel?: string;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  label,
  showLabel = true,
  compact = false,
  disabled = false,
  className,
  align = 'left',
  ariaLabel,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties | null>(null);
  const currentCurrency = getCurrencyOption(value);
  const resolvedLabel = label || t('currency');

  const closeMenu = React.useCallback(() => setIsOpen(false), []);

  const updateMenuPosition = React.useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const estimatedWidth = 360;
    const estimatedHeight = 56 + Math.ceil(CURRENCIES.length / 2) * 54;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const placeAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const width = Math.min(Math.max(rect.width, estimatedWidth), window.innerWidth - 24);
    const leftBase = align === 'right' ? rect.right - width : rect.left;
    const left = Math.max(12, Math.min(leftBase, window.innerWidth - width - 12));
    const top = placeAbove
      ? Math.max(12, rect.top - estimatedHeight - 8)
      : Math.min(window.innerHeight - estimatedHeight - 12, rect.bottom + 8);

    setMenuStyle({
      position: 'fixed',
      top,
      left,
      width,
      zIndex: 12000,
    });
  }, [align]);

  React.useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handleResize = () => updateMenuPosition();
    const handleScroll = () => updateMenuPosition();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu, isOpen, updateMenuPosition]);

  React.useEffect(() => {
    if (!isOpen) return;
    const selected = menuRef.current?.querySelector<HTMLButtonElement>('[data-currency-selected="true"]');
    selected?.focus();
  }, [isOpen, value]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleSelect = (currency: CurrencyCode) => {
    if (disabled) return;
    onChange(normalizeCurrencyCode(currency));
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const triggerText = `${currentCurrency.symbol} ${currentCurrency.code}`;
  const portal = isOpen && typeof document !== 'undefined' && menuStyle
    ? ReactDOM.createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={resolvedLabel}
          style={{
            ...styles.menu,
            ...menuStyle,
          }}
        >
          <div style={styles.menuHeader}>
            <span style={styles.menuTitle}>{resolvedLabel}</span>
            <span style={styles.menuSubtitle}>{t('select')}</span>
          </div>
          <div style={styles.menuGrid}>
            {CURRENCIES.map((currency) => {
              const selected = currency.code === currentCurrency.code;
              return (
                <button
                  key={currency.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-currency-selected={selected ? 'true' : 'false'}
                  onClick={() => handleSelect(currency.code)}
                  style={{
                    ...styles.currencyOption,
                    ...(selected ? styles.currencyOptionActive : {}),
                  }}
                >
                  <div style={styles.currencyOptionTop}>
                    <span style={styles.currencySymbol}>{currency.symbol}</span>
                    <span style={styles.currencyCode}>{currency.code}</span>
                    {selected && <CheckIcon size={14} style={styles.currencyCheckIcon} />}
                  </div>
                  <span style={styles.currencyName}>{currency.name}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={className} style={styles.container}>
      {showLabel && (
        <label style={styles.label}>
          {resolvedLabel}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || `${resolvedLabel}: ${triggerText}`}
        style={{
          ...styles.trigger,
          ...(compact ? styles.triggerCompact : {}),
          ...(isOpen ? styles.triggerOpen : {}),
          ...(disabled ? styles.triggerDisabled : {}),
        }}
      >
        <span style={styles.triggerValue}>
          <span style={styles.triggerSymbol}>{currentCurrency.symbol}</span>
          <span style={styles.triggerCode}>{currentCurrency.code}</span>
        </span>
        <ChevronDownIcon size={14} style={styles.triggerIcon} />
      </button>
      {portal}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    minWidth: 0,
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  trigger: {
    width: '100%',
    minHeight: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
    backgroundColor: 'var(--input-bg, var(--card-bg))',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
    textAlign: 'left',
  },
  triggerCompact: {
    minHeight: '44px',
    padding: '10px 12px',
  },
  triggerOpen: {
    borderColor: 'var(--accent-primary)',
    boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.12)',
  },
  triggerDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  triggerValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    fontSize: '14px',
    fontWeight: 600,
  },
  triggerSymbol: {
    flexShrink: 0,
  },
  triggerCode: {
    whiteSpace: 'nowrap',
  },
  triggerIcon: {
    flexShrink: 0,
    color: 'var(--text-secondary)',
  },
  menu: {
    backgroundColor: 'var(--card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 18px 36px rgba(0, 0, 0, 0.2)',
    padding: '12px',
  },
  menuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '10px',
  },
  menuTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  menuSubtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
  },
  currencyOption: {
    minHeight: '52px',
    padding: '10px 12px',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
    backgroundColor: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
    color: 'var(--text-primary)',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '4px',
  },
  currencyOptionActive: {
    borderColor: 'var(--accent-primary)',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  currencyOptionTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
  },
  currencySymbol: {
    fontSize: '15px',
    fontWeight: 700,
  },
  currencyCode: {
    fontSize: '13px',
    fontWeight: 600,
  },
  currencyCheckIcon: {
    marginLeft: 'auto',
    color: 'var(--accent-primary)',
    flexShrink: 0,
  },
  currencyName: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.2,
  },
};

export default CurrencySelector;
