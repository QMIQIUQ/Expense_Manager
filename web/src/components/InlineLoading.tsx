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

// Add global styles for spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .pending {
    opacity: 0.6;
    filter: grayscale(0.3);
    pointer-events: none;
    transition: opacity 0.3s, filter 0.3s;
  }
`;
document.head.appendChild(styleSheet);

export default InlineLoading;
