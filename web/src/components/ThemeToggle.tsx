import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, effectiveTheme, toggleTheme } = useTheme();

  const getIcon = () => {
    if (theme === 'light') return '☀️';
    if (theme === 'dark') return '🌙';
    return '💻'; // system
  };

  const getLabel = () => {
    if (theme === 'light') return 'Light';
    if (theme === 'dark') return 'Dark';
    return 'System';
  };

  return (
    <button
      onClick={toggleTheme}
      style={styles.button}
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
      title={`Theme: ${getLabel()}`}
    >
      <span style={styles.icon}>{getIcon()}</span>
      <span style={styles.label}>{getLabel()}</span>
    </button>
  );
};

const styles = {
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    border: '1px solid var(--border-color, #e0e0e0)',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-primary, white)',
    color: 'var(--text-primary, #333)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  } as React.CSSProperties,
  icon: {
    fontSize: '18px',
    lineHeight: 1,
  } as React.CSSProperties,
  label: {
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
};

export default ThemeToggle;
