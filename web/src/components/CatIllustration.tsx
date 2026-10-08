import React from 'react';
import catPeek from '../assets/cat-peek.svg';
import catSleep from '../assets/cat-sleep.svg';

interface CatIllustrationProps {
  variant: 'peek' | 'sleep';
  className?: string;
}

const CatIllustration: React.FC<CatIllustrationProps> = ({ variant, className }) => {
  return <img className={`cat-illustration ${className ?? ''}`.trim()} src={variant === 'peek' ? catPeek : catSleep} alt="" aria-hidden="true" />;
};

export default CatIllustration;
