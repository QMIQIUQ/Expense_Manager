import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeMode } from '../contexts/ThemeContext';
import './ThemeToggle.css';

type ThemeChoice = 'default' | 'cat' | 'system';

const ThemeToggle: React.FC = () => {
  const { theme, effectiveTheme, setTheme } = useTheme();
  const { t } = useLanguage();

  const selectedChoice: ThemeChoice = theme === 'system'
    ? 'system'
    : theme === 'cat' || theme === 'cat-dark'
      ? 'cat'
      : 'default';
  const isSystem = selectedChoice === 'system';

  const setBrightness = (brightness: 'light' | 'dark') => {
    if (isSystem) return;

    const nextTheme: ThemeMode = selectedChoice === 'cat'
      ? brightness === 'dark' ? 'cat-dark' : 'cat'
      : brightness;
    setTheme(nextTheme);
  };

  const chooseTheme = (choice: ThemeChoice) => {
    if (choice === 'system') {
      setTheme('system');
      return;
    }

    const useDark = effectiveTheme === 'dark';
    setTheme(choice === 'cat' ? (useDark ? 'cat-dark' : 'cat') : (useDark ? 'dark' : 'light'));
  };

  return (
    <div className="theme-picker" role="group" aria-label={t('appearance')}>
      <div className="theme-picker-title">{t('themeBrightness')}</div>
      <div className="theme-brightness-options">
        <button
          type="button"
          role="switch"
          aria-label={t('themeBrightness')}
          aria-checked={effectiveTheme === 'dark'}
          className={`theme-brightness-switch theme-brightness-switch-${effectiveTheme}`}
          onClick={() => setBrightness(effectiveTheme === 'dark' ? 'light' : 'dark')}
          disabled={isSystem}
        >
          <span className="theme-brightness-thumb" aria-hidden="true" />
          <span className="theme-brightness-state">
            <span aria-hidden="true">☀</span>
            <span>{t('themeLight')}</span>
          </span>
          <span className="theme-brightness-state">
            <span aria-hidden="true">☾</span>
            <span>{t('themeDark')}</span>
          </span>
        </button>
      </div>

      <div className="theme-picker-title theme-choice-title">{t('themeLabel')}</div>
      <div className="theme-picker-options" role="group" aria-label={t('themeLabel')}>
        {([
          { value: 'default', icon: '◐', label: 'themeDefault' },
          { value: 'cat', icon: '🐱', label: 'themeCat' },
          { value: 'system', icon: '▧', label: 'themeSystem' },
        ] as const).map(({ value, icon, label }) => (
          <button
            key={value}
            type="button"
            className={`theme-picker-option${selectedChoice === value ? ' theme-picker-option-active' : ''}`}
            onClick={() => chooseTheme(value)}
            aria-pressed={selectedChoice === value}
          >
            <span className="theme-picker-option-icon" aria-hidden="true">{icon}</span>
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeToggle;
