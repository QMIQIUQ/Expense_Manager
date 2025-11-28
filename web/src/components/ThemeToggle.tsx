import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, effectiveTheme, setTheme } = useTheme();

  const isSystemMode = theme === 'system';
  // When in system mode, reflect the actual resolved system theme (effectiveTheme)
  const displayedTheme = isSystemMode ? effectiveTheme : theme;

  // Toggle button behavior: if currently following system, clicking exits system mode
  // and preserves the current effective theme. Subsequent clicks toggle light/dark.
  const handleToggle = () => {
    if (isSystemMode) {
      // In system mode: invert the current effective system theme when user clicks.
      // If system is dark -> switch to light manual; if system is light -> switch to dark manual.
      setTheme(effectiveTheme === 'light' ? 'dark' : 'light');
      return;
    }
    // Manual mode: invert displayed theme.
    setTheme(displayedTheme === 'light' ? 'dark' : 'light');
  };

  const handleSystemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setTheme('system');
    } else {
      setTheme(effectiveTheme);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.mainRow}>
        <div style={styles.switchContainer}>
          <span style={styles.icon}>☀️</span>
          <button
            onClick={handleToggle}
            style={{
              ...styles.switch,
              opacity: isSystemMode ? 0.9 : 1,
              cursor: 'pointer',
            }}
            aria-label={`Toggle theme. Current: ${isSystemMode ? 'system (' + displayedTheme + ')' : displayedTheme}`}
          >
            <div
              style={{
                ...styles.slider,
                transform: displayedTheme === 'dark' ? 'translateX(20px)' : 'translateX(0)',
                backgroundColor: isSystemMode ? 'var(--bg-primary, #ccc)' : 'var(--bg-primary, white)',
              }}
            />
          </button>
          <span style={styles.icon}>🌙</span>
        </div>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isSystemMode}
            onChange={handleSystemChange}
            style={styles.checkbox}
          />
          <span style={styles.checkboxText}>跟随系统</span>
        </label>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '8px 12px',
    border: '1px solid var(--border-color, #e0e0e0)',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-primary, white)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  } as React.CSSProperties,
  mainRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  } as React.CSSProperties,
  switchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  switch: {
    position: 'relative' as const,
    width: '44px',
    height: '24px',
    backgroundColor: 'var(--border-color, #ddd)',
    borderRadius: '12px',
    border: 'none',
    padding: 0,
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  slider: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-primary, white)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'transform 0.3s ease',
  } as React.CSSProperties,
  icon: {
    fontSize: '18px',
    lineHeight: 1,
  } as React.CSSProperties,
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--text-primary, #333)',
    cursor: 'pointer',
    userSelect: 'none' as const,
  } as React.CSSProperties,
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  } as React.CSSProperties,
  checkboxText: {
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
};

export default ThemeToggle;
