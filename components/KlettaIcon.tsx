import React from 'react';
import { clsx } from 'clsx';

interface KlettaIconProps {
  size?: number;
  className?: string;
}

export const KlettaIcon: React.FC<KlettaIconProps> = ({ size = 24, className }) => {
  return (
    <img 
      src="/kletta.svg" 
      alt="Kletta Logo" 
      width={size} 
      height={size} 
      className={clsx("pointer-events-none select-none", className)}
      style={{ minWidth: size, minHeight: size }}
    />
  );
};
