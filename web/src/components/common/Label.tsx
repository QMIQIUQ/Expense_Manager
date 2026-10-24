import React from 'react';

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  style?: React.CSSProperties;
}

/**
 * Shared label component with dark mode support
 */
const Label: React.FC<LabelProps> = ({ children, htmlFor, required = false, style = {} }) => {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        marginBottom: 'var(--ui-space-1-5)',
        fontSize: 'var(--ui-font-md-sm)',
        fontWeight: 500,
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      {children}
      {required && <span style={{ color: 'var(--error-text)', marginLeft: 'var(--ui-space-1)' }}>*</span>}
    </label>
  );
};

export default Label;
