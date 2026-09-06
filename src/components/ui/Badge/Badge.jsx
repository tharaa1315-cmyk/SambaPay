import React from 'react';
import './Badge.css';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  return (
    <span className={`samba-badge samba-badge--${variant} ${className}`}>
      {children}
    </span>
  );
};
