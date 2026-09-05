import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { notificationsAPI } from '../services/api';

const NotificationContext = createContext(undefined);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef({});

  useEffect(() => {
    const loadNotifications = async () => {
      if (user) {
        try {
          const data = await notificationsAPI.getNotifications();
          setNotifications(Array.isArray(data) ? data : []);
        } catch {
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    };
    loadNotifications();
  }, [user]);

  useEffect(() => () => {
    Object.values(toastTimers.current).forEach(timer => clearTimeout(timer));
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    toastTimers.current[id] = setTimeout(() => dismissToast(id), type === 'error' ? 6000 : 3500);
    return id;
  }, [dismissToast]);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(notification => {
      const notificationId = notification._id || notification.id;
      return String(notificationId) === String(id) ? { ...notification, read: true } : notification;
    }));

    try {
      await notificationsAPI.markAsRead(id);
    } catch {
      // Keep the local seen state so the signal does not reappear during this session.
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    try {
      await notificationsAPI.markAllAsRead();
    } catch {
      // Local optimistic state is kept even if the server call fails.
    }
  };

  const addNotification = async (notif) => {
    if (!user) return;
    try {
      const created = await notificationsAPI.createNotification({
        userId: user._id || user.id,
        message: notif.message
      });
      setNotifications(prev => [created, ...prev]);
    } catch {
      // silently fail
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      toasts,
      showToast,
      addToast: showToast,
      dismissToast,
      markAsRead,
      markAllAsRead,
      addNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
