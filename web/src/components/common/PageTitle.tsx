import React from 'react';

interface PageTitleProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Shared page title component with dark mode support
 */
const PageTitle: React.FC<PageTitleProps> = ({ children, style = {} }) => {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: '24px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      {children}
    </h2>
  );
};

export default PageTitle;
