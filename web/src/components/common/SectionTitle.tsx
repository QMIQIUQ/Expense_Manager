import React from 'react';

interface SectionTitleProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Shared section title component with dark mode support
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ children, style = {} }) => {
  return (
    <h3
      style={{
        margin: 0,
        fontSize: '20px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      {children}
    </h3>
  );
};

export default SectionTitle;
