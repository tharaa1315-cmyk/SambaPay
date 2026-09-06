import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AuthLayout.css';

export const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="auth-loading">Loading...</div>;
  }

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout-left">
        <div className="auth-branding">
          <div className="auth-brand-lockup"><span className="auth-brand-mark" aria-hidden="true"><span /></span><h1>Samba<span>Pay</span></h1></div>
          <p className="auth-slogan">Make every payday feel easy.</p>
          <p className="auth-description">A thoughtful workspace for your people, time, and payroll.</p>
          <div className="auth-note"><span /> Trusted workflows for modern teams</div>
        </div>
      </div>
      <div className="auth-layout-right">
        <div className="auth-content-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
