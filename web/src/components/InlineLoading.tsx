import React from 'react';
import paw from '../assets/paw.svg';
import './InlineLoading.css';

interface InlineLoadingProps {
  size?: number;
  color?: string;
}

const InlineLoading: React.FC<InlineLoadingProps> = ({ size = 16, color = 'var(--accent-primary)' }) => {
  return (
    <span className="inline-loading" aria-hidden="true" style={{ width: size, height: size }}>
      <span
        className="inline-loading-default"
        style={{ ...styles.spinner, width: size, height: size, borderColor: `${color}30`, borderTopColor: color }}
      />
      <span className="inline-loading-paw" style={{ width: size, height: size }}>
        <span className="inline-loading-paw-orbit">
          <img src={paw} alt="" />
        </span>
      </span>
    </span>
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
