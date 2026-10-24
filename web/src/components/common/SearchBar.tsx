import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  style,
}) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={[className, 'ui-control--standard'].filter(Boolean).join(' ')}
      style={{
        width: '100%',
        backgroundColor: 'var(--input-bg)',
        color: 'var(--text-primary)',
        ...style,
      }}
    />
  );
};
