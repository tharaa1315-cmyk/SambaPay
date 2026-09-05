import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Clock,
  Banknote,
  FileCheck,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Bell
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './DashboardLayout.css';

const allNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/employees', label: 'Employees', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
  { path: '/contracts', label: 'Contracts', icon: FileText, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
  { path: '/attendance', label: 'Attendance', icon: Clock },
  { path: '/time-off', label: 'Time Off', icon: Calendar },
  { path: '/payroll', label: 'Payroll', icon: Banknote, roles: ['ADMIN', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
  { path: '/payslips', label: 'Payslips', icon: FileCheck },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const DashboardLayout = () => {
  const { isAuthenticated, isLoading, user, role, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotification();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsNotifMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
        setIsNotifMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="dashboard-layout">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <a className="dashboard-brand" href="/" aria-label="SambaPay home">
            <span className="dashboard-brand__mark" aria-hidden="true"><span /></span>
            <span>Samba<span>Pay</span></span>
          </a>
          <p className="sidebar-tagline">People, time & payroll</p>
          <button className="mobile-close-btn" onClick={closeSidebar}>
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {allNavItems.filter(item => !item.roles || item.roles.includes(role)).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
              onClick={closeSidebar}
            >
              <item.icon className="nav-icon" size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={toggleSidebar}>
              <Menu size={24} />
            </button>
            <div className="header-context">
              <span className="header-context__eyebrow">SAMBAPAY WORKSPACE</span>
              <span className="header-context__title">People operations, made lighter</span>
            </div>
          </div>

          <div className="header-right" ref={dropdownRef}>
            {/* Notification Bell */}
            <div className="notification-container">
              <button
                className="notification-btn"
                onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>

              {isNotifMenuOpen && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    <strong>Notifications</strong>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id || n._id} className={`notification-item ${!n.read ? 'unread' : ''}`} onClick={() => markAsRead(n.id || n._id)}>
                          <p>{n.message}</p>
                          <small>{new Date(n.createdAt || n.timestamp || Date.now()).toLocaleString()}</small>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="user-profile-container">
              <button
                className="user-profile-btn"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <div className="avatar">
                  <User size={20} />
                </div>
                <div className="user-info">
                  <span className="user-name">{user?.name}</span>
                  <span className="user-role">{role}</span>
                </div>
              </button>

              {isProfileMenuOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <strong>{user?.name}</strong>
                    <span>{user?.email}</span>
                  </div>
                  <button className="dropdown-item" onClick={logout}>
                    <LogOut size={16} />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
