import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { dashboardAPI, attendanceAPI } from '../../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Users, UserCheck, Banknote, CalendarDays, ArrowRight, Clock, Timer, ClipboardList, RefreshCw, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const StatCard = ({ label, value, icon, tone }) => (
  <Card>
    <CardContent className="stat-card-content">
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
      <div className={`stat-icon-wrapper bg-${tone}`}>{icon}</div>
    </CardContent>
  </Card>
);

const StatSkeleton = () => (
  <Card>
    <CardContent className="stat-card-content">
      <div className="stat-info">
        <span className="skeleton-line" style={{ width: 90 }} />
        <span className="skeleton-line" style={{ width: 60, height: 28 }} />
      </div>
      <div className="stat-icon-wrapper skeleton-block" />
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const { role, user } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  const isHR = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'].includes(role);
  const isPayroll = ['ADMIN', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'].includes(role);
  const isEmployeeOnly = !isHR && !isPayroll;

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await dashboardAPI.getStats();
      setStats(data || {});
    } catch (err) {
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, role]);

  const checkClockStatus = useCallback(async () => {
    if (!user) return;
    try {
      const employeeId = user.employeeId || user.id;
      const today = new Date().toISOString().split('T')[0];
      const records = await attendanceAPI.getAttendance({ from: today, to: today });
      const list = Array.isArray(records) ? records : [records];
      const record = list.find((r) => String(r.employeeId) === String(employeeId) && String(r.date).slice(0, 10) === today) || null;
      setTodayRecord(record);
      setIsClockedIn(Boolean(record && record.checkIn && !record.checkOut));
    } catch {
      // non-fatal: clock widget stays idle
    }
  }, [user]);

  useEffect(() => {
    checkClockStatus();
  }, [checkClockStatus]);

  const handleClockInOut = async () => {
    setIsAttendanceLoading(true);
    try {
      const employeeId = user.employeeId || user.id;
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      if (!isClockedIn) {
        await attendanceAPI.createAttendance({
          employeeId,
          date: today,
          checkIn: time,
          checkOut: null,
          status: 'Present',
          workingHours: 0
        });
        setIsClockedIn(true);
        addToast(`Clocked in at ${time}. Have a great day!`, 'success');
      } else if (todayRecord) {
        await attendanceAPI.updateAttendance(todayRecord._id || todayRecord.id, {
          checkOut: time,
          status: 'Present'
        });
        setIsClockedIn(false);
        addToast(`Clocked out at ${time}. See you tomorrow!`, 'success');
      }
      await checkClockStatus();
      if (isHR || isPayroll) loadStats();
    } catch (err) {
      addToast(err.message || 'Clock in/out failed', 'error');
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const formatClockTime = (value) => {
    if (!value) return '---';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return String(value).slice(0, 5);
  };

  const weekHours = (stats?.attendanceTrend || []).reduce((sum, d) => sum + (Number(d.hours) || 0), 0);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1 className="dashboard-title">{getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
        <p className="dashboard-subtitle">Here is what&apos;s happening today.</p>
      </div>

      {error && (
        <Card style={{ marginBottom: 'var(--spacing-6)', borderColor: 'var(--color-error)' }}>
          <CardContent style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            <AlertTriangle size={20} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{error}</span>
            <Button variant="secondary" onClick={loadStats} loading={isLoading}>
              <RefreshCw size={14} style={{ marginRight: 6 }} /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          {isHR && (
            <Button variant="secondary" onClick={() => navigate('/employees/new')}>
              Create Employee <ArrowRight size={16} style={{ marginLeft: 8 }} />
            </Button>
          )}
          {isPayroll && (
            <Button variant="secondary" onClick={() => navigate('/payroll')}>
              Run Payroll <ArrowRight size={16} style={{ marginLeft: 8 }} />
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/time-off')}>
            Request Leave <ArrowRight size={16} style={{ marginLeft: 8 }} />
          </Button>
        </div>
      </div>

      {/* Admin/HR/Payroll Stats */}
      {(isHR || isPayroll) && (
        <div className="stats-grid">
          {isLoading ? (
            <><StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton /></>
          ) : (
            <>
              {isHR && (
                <>
                  <StatCard label="Total Employees" value={stats?.totalEmployees ?? '---'} tone="primary" icon={<Users size={24} className="text-primary" />} />
                  <StatCard label="Active Employees" value={stats?.activeEmployees ?? '---'} tone="success" icon={<UserCheck size={24} className="text-success" />} />
                  <StatCard label="Present Today" value={stats?.presentToday ?? '---'} tone="info" icon={<UserCheck size={24} className="text-info" />} />
                </>
              )}
              {isPayroll && (
                <StatCard
                  label="Monthly Payroll"
                  value={`$${Number(stats?.monthlyPayroll || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  tone="warning"
                  icon={<Banknote size={24} className="text-warning" />}
                />
              )}
              <StatCard label="On Leave" value={stats?.onLeaveEmployees ?? '---'} tone="info" icon={<CalendarDays size={24} className="text-info" />} />
              <StatCard label="Pending Leave Requests" value={stats?.pendingLeaves ?? '---'} tone="warning" icon={<ClipboardList size={24} className="text-warning" />} />
            </>
          )}
        </div>
      )}

      {/* Charts section for Payroll / Admin */}
      {isPayroll && !isLoading && (stats?.payrollTrend?.length || 0) > 0 && (
        <div className="charts-section">
          <Card className="chart-card">
            <CardHeader>
              <CardTitle>Payroll Trend (Last Paid Runs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.payrollTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-200)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-gray-500)', fontSize: 12 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--color-gray-500)', fontSize: 12 }}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Tooltip
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Cost']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                    />
                    <Line type="monotone" dataKey="cost" stroke="var(--color-primary-500)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-primary-500)' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee specific view */}
      {isEmployeeOnly && (
        <>
          <div className="stats-grid" style={{ marginBottom: 'var(--spacing-6)' }}>
            <Card>
              <CardContent style={{ padding: 'var(--spacing-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)' }}>
                  <Clock size={18} style={{ color: 'var(--color-primary-500)' }} />
                  <span className="stat-label">Today</span>
                </div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                  {isClockedIn
                    ? `Working since ${formatClockTime(todayRecord?.checkIn)}`
                    : todayRecord?.checkOut
                      ? `Clocked out at ${formatClockTime(todayRecord?.checkOut)}`
                      : 'Not clocked in yet'}
                </div>
                <Button
                  style={{ marginTop: 'var(--spacing-3)' }}
                  variant={isClockedIn ? 'danger' : 'primary'}
                  onClick={handleClockInOut}
                  loading={isAttendanceLoading}
                >
                  <Timer size={16} style={{ marginRight: 8 }} />
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 'var(--spacing-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)' }}>
                  <Timer size={18} style={{ color: 'var(--color-info-500)' }} />
                  <span className="stat-label">Hours (last 7 days)</span>
                </div>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{weekHours.toFixed(1)} hrs</div>
              </CardContent>
            </Card>
          </div>

          <div className="charts-section">
            <Card className="chart-card">
              <CardHeader>
                <CardTitle>Working Hours (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="chart-container">
                  {(stats?.attendanceTrend?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stats.attendanceTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-200)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-gray-500)', fontSize: 12 }} tickFormatter={(v) => String(v).slice(5)} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-gray-500)', fontSize: 12 }} />
                        <Tooltip
                          formatter={(value) => [`${value} hrs`, 'Worked']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                        />
                        <Line type="monotone" dataKey="hours" stroke="var(--color-info-500)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-info-500)' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p style={{ color: 'var(--color-gray-500)', textAlign: 'center', padding: 'var(--spacing-6) 0' }}>
                      No attendance recorded in the last 7 days. Clock in to start tracking your hours.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
