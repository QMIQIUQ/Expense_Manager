import React from 'react';

type TextVariant = 'primary' | 'secondary' | 'tertiary';
type TextSize = 'sm' | 'base' | 'lg' | 'xl';

interface TextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  size?: TextSize;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Shared text component with dark mode support
 */
const Text: React.FC<TextProps> = ({
  children,
  variant = 'primary',
  size = 'base',
  style = {},
  className,
}) => {
  const variantStyles: Record<TextVariant, React.CSSProperties> = {
    primary: { color: 'var(--text-primary)' },
    secondary: { color: 'var(--text-secondary)' },
    tertiary: { color: 'var(--text-tertiary)' },
  };

  const sizeStyles: Record<TextSize, React.CSSProperties> = {
    sm: { fontSize: '12px' },
    base: { fontSize: '14px' },
    lg: { fontSize: '16px' },
    xl: { fontSize: '18px' },
  };

  return (
    <span
      className={className}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export default Text;
