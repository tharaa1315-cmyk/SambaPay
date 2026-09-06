import React from 'react';
import './Card.css';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`samba-card ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`samba-card-header ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`samba-card-title ${className}`} {...props}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`samba-card-content ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`samba-card-footer ${className}`} {...props}>
    {children}
  </div>
);
