import React from 'react';
import { Button } from '../Button/Button';
import { AlertTriangle } from 'lucide-react';
import './ConfirmationModal.css';

export const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="samba-modal-overlay">
      <div className="samba-modal-content">
        <div className="samba-modal-header">
          {variant === 'danger' && <AlertTriangle size={24} className="text-error" style={{ marginRight: 'var(--spacing-3)' }} />}
          <h2 className="samba-modal-title">{title}</h2>
        </div>
        <div className="samba-modal-body">
          <p>{message}</p>
        </div>
        <div className="samba-modal-footer">
          <Button variant="ghost" onClick={onCancel}>{cancelText}</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};
