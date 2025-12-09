import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

interface ShowMoreButtonProps {
  /** Total number of items */
  totalCount: number;
  /** Number of items currently shown */
  visibleCount: number;
  /** Whether expanded state is active */
  isExpanded: boolean;
  /** Callback when button is clicked */
  onToggle: () => void;
  /** Optional: Custom label for item type (e.g., "cards", "expenses") */
  itemLabel?: string;
}

/**
 * Reusable "Show More" / "Show Less" button for widget lists
 * Displays the count of hidden items and allows expansion/collapse
 */
const ShowMoreButton: React.FC<ShowMoreButtonProps> = ({
  totalCount,
  visibleCount,
  isExpanded,
  onToggle,
  itemLabel,
}) => {
  const { t } = useLanguage();
  
  const hiddenCount = totalCount - visibleCount;
  
  // Don't render if there's nothing to expand
  if (hiddenCount <= 0 && !isExpanded) {
    return null;
  }

  return (
    <button 
      className="more-cards-button"
      onClick={onToggle}
      type="button"
    >
      {isExpanded 
        ? `▲ ${t('showLess')}`
        : `+${hiddenCount} ${t('more')}${itemLabel ? ` ${itemLabel}` : ''}`
      }
    </button>
  );
};

export default ShowMoreButton;
