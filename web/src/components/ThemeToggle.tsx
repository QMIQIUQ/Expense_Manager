import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeMode } from '../contexts/ThemeContext';
import './ThemeToggle.css';

const themeOptions: { value: ThemeMode; icon: string; label: 'themeLight' | 'themeDark' | 'themeSystem' | 'themeCat' | 'themeCatDark' }[] = [
  { value: 'light', icon: '☀️', label: 'themeLight' },
  { value: 'dark', icon: '🌙', label: 'themeDark' },
  { value: 'system', icon: '💻', label: 'themeSystem' },
  { value: 'cat', icon: '🐱', label: 'themeCat' },
  { value: 'cat-dark', icon: '🌙🐱', label: 'themeCatDark' },
];

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="theme-picker" role="group" aria-label={t('themeLabel')}>
      <div className="theme-picker-title">{t('themeLabel')}</div>
      <div className="theme-picker-options">
        {themeOptions.map(({ value, icon, label }) => (
          <button
            key={value}
            type="button"
            className={`theme-picker-option${theme === value ? ' theme-picker-option-active' : ''}`}
            onClick={() => setTheme(value)}
            aria-pressed={theme === value}
          >
            <span aria-hidden="true">{icon}</span>
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeToggle;
