import React from 'react';
import './Select.css';

export const Select = ({
  label,
  error,
  helperText,
  id,
  options = [],
  className = '',
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;
  
  return (
    <div className={`samba-select-wrapper ${className}`}>
      {label && (
        <label htmlFor={selectId} className="samba-select-label">
          {label}
        </label>
      )}
      <div className="samba-select-container">
        <select
          id={selectId}
          className={`samba-select ${hasError ? 'samba-select--error' : ''}`}
          {...props}
        >
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {(error || helperText) && (
        <span className={`samba-select-helper ${hasError ? 'samba-select-helper--error' : ''}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
};
