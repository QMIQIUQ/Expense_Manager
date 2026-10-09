import React, { useEffect, useRef } from 'react';
import { FeatureTab } from '../../types';

interface CompactNavigationProps {
  features: FeatureTab[];
  activeTab: FeatureTab;
  labels: Record<FeatureTab, string>;
  navigationLabel: string;
  isMobile: boolean;
  onNavigate: (feature: FeatureTab) => void;
}

const CompactNavigation: React.FC<CompactNavigationProps> = ({
  features,
  activeTab,
  labels,
  navigationLabel,
  isMobile,
  onNavigate,
}) => {
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const navigationOrderKey = features.join('|');

  useEffect(() => {
    if (activeItemRef.current && 'scrollIntoView' in activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeTab, navigationOrderKey]);

  return (
    <div className={`compact-navigation ${isMobile ? 'compact-navigation-mobile' : ''}`}>
      <nav className="compact-navigation-scroll" aria-label={navigationLabel}>
        {features.map((feature) => {
          const isActive = activeTab === feature;
          return (
            <button
              key={feature}
              ref={isActive ? activeItemRef : undefined}
              type="button"
              className={`compact-navigation-item ${isActive ? 'is-active' : ''}`}
              onClick={() => onNavigate(feature)}
              aria-current={isActive ? 'page' : undefined}
            >
              {labels[feature]}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default CompactNavigation;
