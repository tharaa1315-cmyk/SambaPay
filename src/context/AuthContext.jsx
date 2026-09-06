import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('samba_token');
      const storedUser = localStorage.getItem('samba_user');
      
      if (token && storedUser) {
        try {
          const res = await authAPI.getMe();
          setUser(res);
          setRole(res.role);
        } catch {
          localStorage.removeItem('samba_token');
          localStorage.removeItem('samba_user');
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    localStorage.setItem('samba_token', res.token);
    localStorage.setItem('samba_user', JSON.stringify(res.user));
    setUser(res.user);
    setRole(res.user.role);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('samba_token');
    localStorage.removeItem('samba_user');
    setUser(null);
    setRole(null);
  };

  const updateCurrentUser = (updates) => {
    setUser((currentUser) => {
      const nextUser = { ...currentUser, ...updates };
      localStorage.setItem('samba_user', JSON.stringify(nextUser));
      return nextUser;
    });
    if (updates.role) setRole(updates.role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      isAuthenticated: !!user,
      isLoading,
      login,
      updateCurrentUser,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
