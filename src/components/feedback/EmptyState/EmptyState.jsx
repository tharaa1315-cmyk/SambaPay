import React from 'react';
import './EmptyState.css';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`samba-empty-state ${className}`}>
      {Icon && (
        <div className="samba-empty-icon-container">
          <Icon className="samba-empty-icon" size={48} />
        </div>
      )}
      <h3 className="samba-empty-title">{title}</h3>
      {description && <p className="samba-empty-description">{description}</p>}
      {action && <div className="samba-empty-action">{action}</div>}
    </div>
  );
};
