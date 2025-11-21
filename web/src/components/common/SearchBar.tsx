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
      className={className}
      style={{
        width: '100%',
        padding: '10px 12px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: 'var(--input-bg)',
        color: 'var(--text-primary)',
        transition: 'border-color 0.2s',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-primary)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color)';
      }}
    />
  );
};
