import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layouts
import { AuthLayout } from './layouts/AuthLayout/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout/DashboardLayout';

// Auth Pages
import { Login } from './pages/auth/Login/Login';
import { Signup } from './pages/auth/Signup/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword/ResetPassword';

// Dashboard Module
import { Dashboard } from './pages/dashboard/Dashboard/Dashboard';

// Employee Module
import { EmployeeList } from './pages/dashboard/Employees/EmployeeList';
import { EmployeeCreate } from './pages/dashboard/Employees/EmployeeCreate';
import { EmployeeProfile } from './pages/dashboard/Employees/EmployeeProfile';

// Contracts Module
import { ContractsList } from './pages/dashboard/Contracts/ContractsList';
import { ContractForm } from './pages/dashboard/Contracts/ContractForm';

// Phase 3 Modules
import { AttendanceList } from './pages/dashboard/Attendance/AttendanceList';
import { TimeOffPage } from './pages/dashboard/TimeOff/TimeOffPage';

// Phase 4 Modules
import { PayrollDashboard } from './pages/dashboard/Payroll/PayrollDashboard';
import { PayrunWizard } from './pages/dashboard/Payroll/PayrunWizard';
import { PayslipsList } from './pages/dashboard/Payslips/PayslipsList';
import { PayslipDetail } from './pages/dashboard/Payslips/PayslipDetail';
import { ReportsPage } from './pages/dashboard/Reports/ReportsPage';

import { SettingsPage } from './pages/dashboard/Settings/SettingsPage';
import { Landing } from './pages/Landing/Landing';
import { Toaster } from './components/feedback/Toaster/Toaster';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Protected Dashboard Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/employees/new" element={<EmployeeCreate />} />
              <Route path="/employees/:id" element={<EmployeeProfile />} />

              <Route path="/contracts" element={<ContractsList />} />
              <Route path="/contracts/new" element={<ContractForm />} />

              <Route path="/attendance" element={<AttendanceList />} />
              <Route path="/time-off" element={<TimeOffPage />} />

              <Route path="/payroll" element={<PayrollDashboard />} />
              <Route path="/payroll/run/new" element={<PayrunWizard />} />
              <Route path="/payroll/run/:id" element={<PayrunWizard />} />

              <Route path="/payslips" element={<PayslipsList />} />
              <Route path="/payslips/:id" element={<PayslipDetail />} />

              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback route */}
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
