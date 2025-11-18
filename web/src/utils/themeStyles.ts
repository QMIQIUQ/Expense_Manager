/**
 * Theme-aware style utilities
 * Use these to create styles that automatically adapt to light/dark mode
 */

export const getThemedStyles = () => {
  // Get computed CSS variables from the document
  const root = document.documentElement;
  const style = getComputedStyle(root);
  
  return {
    bgPrimary: style.getPropertyValue('--bg-primary').trim(),
    bgSecondary: style.getPropertyValue('--bg-secondary').trim(),
    bgTertiary: style.getPropertyValue('--bg-tertiary').trim(),
    bgQuaternary: style.getPropertyValue('--bg-quaternary').trim(),
    textPrimary: style.getPropertyValue('--text-primary').trim(),
    textSecondary: style.getPropertyValue('--text-secondary').trim(),
    textTertiary: style.getPropertyValue('--text-tertiary').trim(),
    borderColor: style.getPropertyValue('--border-color').trim(),
    cardBg: style.getPropertyValue('--card-bg').trim(),
    inputBg: style.getPropertyValue('--input-bg').trim(),
    modalBg: style.getPropertyValue('--modal-bg').trim(),
    iconBg: style.getPropertyValue('--icon-bg').trim(),
    successBg: style.getPropertyValue('--success-bg').trim(),
    warningBg: style.getPropertyValue('--warning-bg').trim(),
    errorBg: style.getPropertyValue('--error-bg').trim(),
    infoBg: style.getPropertyValue('--info-bg').trim(),
    hoverBg: style.getPropertyValue('--hover-bg').trim(),
    shadow: style.getPropertyValue('--shadow').trim(),
    shadowMd: style.getPropertyValue('--shadow-md').trim(),
  };
};

// Common themed styles that can be spread into component styles
export const themedCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

export const themedInputStyle: React.CSSProperties = {
  backgroundColor: 'var(--input-bg)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

export const themedModalStyle: React.CSSProperties = {
  backgroundColor: 'var(--modal-bg)',
  color: 'var(--text-primary)',
};

export const themedTextPrimary: React.CSSProperties = {
  color: 'var(--text-primary)',
};

export const themedTextSecondary: React.CSSProperties = {
  color: 'var(--text-secondary)',
};

export const themedTextTertiary: React.CSSProperties = {
  color: 'var(--text-tertiary)',
};
