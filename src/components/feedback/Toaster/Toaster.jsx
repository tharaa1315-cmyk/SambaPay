import React from 'react';
import { useNotification } from '../../../context/NotificationContext';
import './Toaster.css';

const ICONS = {
  success: '✓',
  error: '!',
  info: 'i'
};

export const Toaster = () => {
  const { toasts, dismissToast } = useNotification();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toaster" aria-live="polite" role="status">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type || 'success'}`}>
          <span className="toast__icon" aria-hidden="true">{ICONS[toast.type] || ICONS.success}</span>
          <span className="toast__message">{toast.message}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toaster;