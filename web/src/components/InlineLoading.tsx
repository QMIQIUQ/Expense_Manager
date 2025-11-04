import React from 'react';

interface InlineLoadingProps {
  size?: number;
  color?: string;
}

const InlineLoading: React.FC<InlineLoadingProps> = ({ size = 16, color = '#6366f1' }) => {
  return (
    <div style={{ ...styles.spinner, width: size, height: size, borderColor: `${color}30`, borderTopColor: color }}>
    </div>
  );
};

const styles = {
  spinner: {
    display: 'inline-block',
    border: '2px solid',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

export default InlineLoading;
