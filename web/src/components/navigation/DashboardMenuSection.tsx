import React, { ReactNode } from 'react';

interface DashboardMenuSectionProps {
  id: string;
  title: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  contentClassName?: string;
  children: ReactNode;
}

const DashboardMenuSection: React.FC<DashboardMenuSectionProps> = ({
  id,
  title,
  expanded,
  onToggle,
  contentClassName = '',
  children,
}) => (
  <div className="dashboard-menu-section border-b border-gray-200">
    <button
      type="button"
      className="dashboard-menu-section-trigger"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={id}
    >
      <span>{title}</span>
      <svg
        className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    <div
      id={id}
      className={`dashboard-menu-section-content ${contentClassName}`.trim()}
      hidden={!expanded}
    >
      {children}
    </div>
  </div>
);

export default DashboardMenuSection;
