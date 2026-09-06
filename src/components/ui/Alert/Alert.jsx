import React from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import './Alert.css';

export const Alert = ({ type = 'info', message, title, className = '' }) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="alert-icon success" />;
      case 'warning': return <AlertTriangle size={20} className="alert-icon warning" />;
      case 'error': return <XCircle size={20} className="alert-icon error" />;
      default: return <Info size={20} className="alert-icon info" />;
    }
  };

  return (
    <div className={`samba-alert alert-${type} ${className}`}>
      {getIcon()}
      <div className="alert-content">
        {title && <h5 className="alert-title">{title}</h5>}
        <p className="alert-message">{message}</p>
      </div>
    </div>
  );
};
