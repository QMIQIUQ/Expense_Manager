import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FeatureTab } from '../../types';

interface CompactNavigationProps {
  primaryFeatures: FeatureTab[];
  overflowFeatures: FeatureTab[];
  activeTab: FeatureTab;
  labels: Record<FeatureTab, string>;
  navigationLabel: string;
  moreLabel: string;
  isMobile: boolean;
  onNavigate: (feature: FeatureTab) => void;
  onOpenChange?: (open: boolean) => void;
}

const CompactNavigation: React.FC<CompactNavigationProps> = ({
  primaryFeatures,
  overflowFeatures,
  activeTab,
  labels,
  navigationLabel,
  moreLabel,
  isMobile,
  onNavigate,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  }, [onOpenChange]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setOpen]);

  const moreIsActive = overflowFeatures.includes(activeTab);

  return (
    <div className={`compact-navigation ${isMobile ? 'compact-navigation-mobile' : ''}`} ref={rootRef}>
      <nav className="compact-navigation-scroll" aria-label={navigationLabel}>
        {primaryFeatures.map((feature) => (
          <button
            key={feature}
            type="button"
            className={`compact-navigation-item ${activeTab === feature ? 'is-active' : ''}`}
            onClick={() => {
              onNavigate(feature);
              setOpen(false);
            }}
            aria-current={activeTab === feature ? 'page' : undefined}
          >
            {labels[feature]}
          </button>
        ))}
      </nav>
      {overflowFeatures.length > 0 && (
        <div className="compact-navigation-more">
          <button
            ref={triggerRef}
            type="button"
            className={`compact-navigation-item compact-navigation-more-trigger ${moreIsActive ? 'is-active' : ''}`}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            aria-controls="compact-navigation-menu"
            aria-current={moreIsActive ? 'page' : undefined}
            onClick={() => setOpen(!isOpen)}
          >
            <span>{moreLabel}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {isOpen && (
            <div className="compact-navigation-menu" id="compact-navigation-menu" role="menu">
              {overflowFeatures.map((feature) => (
                <button
                  key={feature}
                  type="button"
                  role="menuitem"
                  className={`compact-navigation-menu-item ${activeTab === feature ? 'is-active' : ''}`}
                  onClick={() => {
                    onNavigate(feature);
                    setOpen(false);
                  }}
                  aria-current={activeTab === feature ? 'page' : undefined}
                >
                  {labels[feature]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompactNavigation;
