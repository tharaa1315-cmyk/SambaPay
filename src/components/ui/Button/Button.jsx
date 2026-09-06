import React from 'react';
import './Button.css';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) => {
  const baseClass = 'samba-btn';
  const variantClass = `samba-btn--${variant}`;
  const sizeClass = `samba-btn--${size}`;
  const loadingClass = loading ? 'samba-btn--loading' : '';
  const classes = [baseClass, variantClass, sizeClass, loadingClass, className].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading && (
        <span className="samba-btn__spinner">
          <svg className="spinner-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="spinner-path" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          </svg>
        </span>
      )}
      <span className="samba-btn__content">{children}</span>
    </button>
  );
};
