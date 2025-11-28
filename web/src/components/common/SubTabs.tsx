import React from 'react';

export interface SubTab {
  id: string;
  label: string;
  icon?: string;
}

interface SubTabsProps {
  tabs: SubTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/**
 * A reusable sub-tab navigation component with underline style.
 * Used for switching between different views within a tab.
 */
const SubTabs: React.FC<SubTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  const styles = {
    container: {
      display: 'flex',
      gap: '8px',
      borderBottom: '1px solid var(--border-color)',
      marginBottom: '16px',
    },
    tab: (isActive: boolean) => ({
      padding: '8px 16px',
      fontWeight: 500,
      fontSize: '0.875rem',
      transition: 'all 0.2s',
      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
    }),
  };

  return (
    <div style={styles.container}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={styles.tab(activeTab === tab.id)}
        >
          {tab.icon && `${tab.icon} `}{tab.label}
        </button>
      ))}
    </div>
  );
};

export default SubTabs;
