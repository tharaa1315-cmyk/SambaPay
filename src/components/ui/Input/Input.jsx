import React from 'react';
import './Input.css';

export const Input = ({
  label,
  error,
  helperText,
  id,
  type = 'text',
  className = '',
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;
  
  return (
    <div className={`samba-input-wrapper ${className}`}>
      {label && (
        <label htmlFor={inputId} className="samba-label">
          {label}
        </label>
      )}
      <div className="samba-input-container">
        <input
          id={inputId}
          type={type}
          className={`samba-input ${hasError ? 'samba-input--error' : ''}`}
          {...props}
        />
      </div>
      {(error || helperText) && (
        <span className={`samba-input-helper ${hasError ? 'samba-input-helper--error' : ''}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
};
