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
        margin: 'var(--ui-space-0px)',
        fontSize: 'var(--ui-font-xl)',
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
