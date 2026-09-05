import React from 'react';
import './Spinner.css';

export const Spinner = ({ size = 'md', className = '' }) => {
  return (
    <div className={`samba-spinner samba-spinner--${size} ${className}`}>
      <svg className="samba-spinner-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle className="samba-spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      </svg>
    </div>
  );
};
