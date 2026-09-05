import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { leaveAPI, timeOffConfigAPI, employeesAPI } from '../../../services/api';
import { Table } from '../../../components/ui/Table/Table';
import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/Card/Card';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal/ConfirmationModal';
import { EmptyState } from '../../../components/feedback/EmptyState/EmptyState';
import { Spinner } from '../../../components/feedback/Spinner/Spinner';
import { Plus, Check, X, CalendarClock, PlaneTakeoff } from 'lucide-react';

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'];
const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'];

const daysBetween = (start, end) => {
  if (!start || !end) return 0;
  const diff = Math.floor((new Date(end) - new Date(start)) / 86400000) + 1;
  return Number.isNaN(diff) || diff < 0 ? 0 : diff;
};

export const TimeOffPage = () => {
  const { user, role } = useAuth();
  const { addToast, addNotification } = useNotification();
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [confirmAction, setConfirmAction] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({ type: 'Annual Leave', timeOffTypeId: '', employeeId: '', startDate: '', endDate: '', reason: '' });

  const isEmployee = role === 'EMPLOYEE';
  const isHR = HR_ROLES.includes(role);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');
    try {
      const [leaveData, typeData, allocationData] = await Promise.all([
        leaveAPI.getLeaveRequests(),
        timeOffConfigAPI.getTypes().catch(() => []),
        timeOffConfigAPI.getAllocations(isEmployee && user.employeeId ? { employeeId: user.employeeId } : {}).catch(() => [])
      ]);
      setRequests(Array.isArray(leaveData) ? leaveData.filter((record) => record && typeof record === 'object') : []);
      setTypes(Array.isArray(typeData) ? typeData : (typeData && typeData.types) || []);
      setAllocations(Array.isArray(allocationData) ? allocationData : (allocationData && allocationData.allocations) || []);
      if (!isEmployee) { try { const empData = await employeesAPI.getEmployees(); setEmployees(Array.isArray(empData) ? empData : []); } catch { setEmployees([]); } }
    } catch (err) {
      const msg = (err && err.message) || 'Failed to load time-off data';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, isEmployee, addToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleApprove = async (req) => {
    setConfirmAction(null);
    try {
      await leaveAPI.approveLeave(req._id || req.id);
      addToast('Approved ' + (req.employeeName || 'leave request'));
      loadAll();
    } catch (err) {
      addToast((err && err.message) || 'Failed to approve leave', 'error');
    }
  };

  const handleReject = async (req) => {
    setConfirmAction(null);
    try {
      await leaveAPI.rejectLeave(req._id || req.id);
      addToast('Rejected ' + (req.employeeName || 'leave request'), 'info');
      addNotification({ message: 'Your leave request (' + req.startDate + ' to ' + req.endDate + ') was rejected.' });
      loadAll();
    } catch (err) {
      addToast((err && err.message) || 'Failed to reject leave', 'error');
    }
  };

  const handleCancel = async (req) => {
    setConfirmAction(null);
    try {
      await leaveAPI.cancelLeave(req._id || req.id);
      addToast('Leave request cancelled', 'info');
      loadAll();
    } catch (err) {
      addToast((err && err.message) || 'Failed to cancel leave', 'error');
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) { addToast('Start and end dates are required', 'error'); return; }
    if (new Date(formData.endDate) < new Date(formData.startDate)) { addToast('End date cannot be before the start date', 'error'); return; }
    if (!isEmployee && !formData.employeeId) { addToast('Select an employee for this request', 'error'); return; }
    setIsSubmitting(true);
    try {
      const payload = { type: formData.type, startDate: formData.startDate, endDate: formData.endDate, reason: formData.reason };
      if (formData.timeOffTypeId) payload.timeOffTypeId = formData.timeOffTypeId;
      if (!isEmployee) payload.employeeId = formData.employeeId;
      await leaveAPI.createLeaveRequest(payload);
      addToast('Leave request submitted');
      addNotification({ message: 'New leave request: ' + formData.type + ' (' + formData.startDate + ' to ' + formData.endDate + ')' });
      setIsModalOpen(false);
      setFormData({ type: 'Annual Leave', timeOffTypeId: '', employeeId: '', startDate: '', endDate: '', reason: '' });
      loadAll();
    } catch (err) {
      addToast((err && err.message) || 'Failed to submit leave request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      case 'Cancelled': return 'default';
      default: return 'warning';
    }
  };

  const filteredRequests = useMemo(() => requests.filter((r) => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (typeFilter !== 'All' && r.type !== typeFilter) return false;
    return true;
  }), [requests, statusFilter, typeFilter]);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'Pending').length, [requests]);

  const balances = useMemo(() => {
    const ownId = (user && (user.employeeId || user.id)) || null;
    return allocations
      .filter((a) => !isEmployee || String((a.employeeId && a.employeeId._id) || a.employeeId) === String(ownId))
      .map((a) => {
        const typeId = (a.timeOffTypeId && a.timeOffTypeId._id) || a.timeOffTypeId;
        const typeInfo = types.find((t) => String(t._id) === String(typeId));
        const total = (a.totalAmount != null) ? a.totalAmount : (a.amount != null ? a.amount : (typeInfo && typeInfo.defaultAllocation) || 0);
        const taken = a.takenAmount || 0;
        const remaining = (a.remainingAmount != null) ? a.remainingAmount : Math.max(0, total - taken);
        return { id: a._id || a.id || `${typeId || 'time-off'}-${String(a.employeeId?._id || a.employeeId || 'current')}`, name: (typeInfo && typeInfo.name) || (a.timeOffTypeId && a.timeOffTypeId.name) || 'Time Off', total, taken, remaining };
      });
  }, [allocations, types, isEmployee, user]);

  const columns = [
    ...(isHR ? [{ key: 'employeeName', label: 'Employee' }] : []),
    { key: 'type', label: 'Type' },
    { key: 'startDate', label: 'From', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { key: 'endDate', label: 'To', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { key: 'duration', label: 'Days', render: (value, row) => value ?? daysBetween(row.startDate, row.endDate) },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (value) => {
      const status = value || 'Pending';
      return <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>;
    } },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        if (row.status === 'Pending' && isHR) {
          return (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="success" onClick={() => setConfirmAction({ kind: 'approve', req: row })}><Check size={14} /> Approve</Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmAction({ kind: 'reject', req: row })}><X size={14} /> Reject</Button>
            </div>
          );
        }
        if (row.status === 'Pending' && !isHR) {
          return <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ kind: 'cancel', req: row })}>Cancel</Button>;
        }
        return <span style={{ color: 'var(--color-gray-400)', fontSize: 13 }}>-</span>;
      }
    }
  ];

  const typeOptions = [
    ...types.filter((t) => t.active !== false).map((t) => ({ label: t.name, value: t.name, id: t._id })),
    { label: 'Other', value: 'Other', id: '' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)', flexWrap: 'wrap', gap: 'var(--spacing-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 0 }}>Time Off</h1>
          <p style={{ color: 'var(--color-gray-500)', margin: '4px 0 0' }}>
            {isHR ? (pendingCount + ' pending request' + (pendingCount === 1 ? '' : 's') + ' awaiting review') : 'Request and track your time off'}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen((open) => !open)}><Plus size={16} style={{ marginRight: 6 }} /> {isModalOpen ? 'Close Form' : 'New Request'}</Button>
      </div>

      {balances.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
          {balances.map((b) => (
            <Card key={b.id}>
              <CardContent style={{ padding: 'var(--spacing-4)' }}>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>{b.name} Balance</div>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                  {b.remaining} <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 400 }}>/ {b.total} Days</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--color-gray-200)', marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: (b.total > 0 ? Math.min(100, (b.remaining / b.total) * 100) : 0) + '%', background: 'var(--color-primary-500)', borderRadius: 3, transition: 'width 400ms ease' }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isModalOpen && (
        <Card style={{ marginBottom: 'var(--spacing-6)', border: '1px solid var(--color-primary-200)' }}>
          <CardHeader><CardTitle>New Leave Request</CardTitle></CardHeader>
          <CardContent>
            <form id="leave-form" onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              {!isEmployee && (
                <Select id="leave-employee" label="Employee" required value={formData.employeeId || ''} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} options={[{ label: 'Select employee...', value: '' }, ...employees.map((emp) => ({ label: emp.name + ' (' + (emp.department || 'General') + ')', value: emp._id || emp.id }))]} />
              )}
              <Select
                id="type" label="Leave Type" required value={formData.type}
                onChange={(e) => { const selected = typeOptions.find((o) => o.value === e.target.value); setFormData({ ...formData, type: e.target.value, timeOffTypeId: (selected && selected.id) || '' }); }}
                options={typeOptions.map(({ label, value }) => ({ label, value }))}
              />
              <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}><Input id="startDate" label="Start Date" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required /></div>
                <div style={{ flex: 1, minWidth: 160 }}><Input id="endDate" label="End Date" type="date" value={formData.endDate} min={formData.startDate || undefined} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required /></div>
              </div>
              {formData.startDate && formData.endDate && daysBetween(formData.startDate, formData.endDate) > 0 && (
                <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><CalendarClock size={15} /> Duration: <strong>{daysBetween(formData.startDate, formData.endDate)} day(s)</strong></p>
              )}
              <Input id="reason" label="Reason" placeholder="Brief reason for leave..." value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required />
            </form>
          </CardContent>
          <CardFooter style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-3)' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button form="leave-form" type="submit" loading={isSubmitting}>Submit Request</Button>
          </CardFooter>
        </Card>
      )}

      <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_FILTERS.map((status) => (
          <button key={status} type="button" onClick={() => setStatusFilter(status)}
            style={{ padding: '6px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: '1px solid', transition: 'all 150ms ease', borderColor: statusFilter === status ? 'var(--color-primary-500)' : 'var(--color-gray-200)', background: statusFilter === status ? 'var(--color-primary-50)' : 'white', color: statusFilter === status ? 'var(--color-primary-700)' : 'var(--color-gray-600)', fontWeight: statusFilter === status ? 600 : 400 }}>
            {status}
          </button>
        ))}
        {types.length > 0 && (
          <div style={{ marginLeft: 'auto', minWidth: 180 }}>
            <Select id="type-filter" aria-label="Filter by type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[{ label: 'All types', value: 'All' }, ...types.map((t) => ({ label: t.name, value: t.name }))]} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--spacing-3)', padding: 'var(--spacing-10)' }}><Spinner size="lg" /><span>Loading time off...</span></div>
      ) : error ? (
        <EmptyState icon={PlaneTakeoff} title="Unable to load time off data." description={error} action={<Button onClick={loadAll}>Try again</Button>} />
      ) : filteredRequests.length === 0 ? (
        <EmptyState icon={PlaneTakeoff} title={requests.length === 0 ? 'No time off records found.' : 'No requests match your filters'} description={requests.length === 0 ? 'Submit your first time-off request to see it here.' : 'Try a different status or type filter.'} action={requests.length === 0 ? <Button onClick={() => setIsModalOpen(true)}><Plus size={16} style={{ marginRight: 6 }} />New Request</Button> : null} />
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
          <Table columns={columns} data={filteredRequests} />
        </div>
      )}

      <ConfirmationModal
        isOpen={!!confirmAction}
        title={confirmAction && confirmAction.kind === 'approve' ? 'Approve leave request?' : confirmAction && confirmAction.kind === 'reject' ? 'Reject leave request?' : 'Cancel leave request?'}
        message={confirmAction && confirmAction.kind === 'approve'
          ? 'Approve ' + ((confirmAction.req && confirmAction.req.employeeName) || 'this') + '\'s ' + (confirmAction.req && confirmAction.req.type) + ' (' + daysBetween(confirmAction.req && confirmAction.req.startDate, confirmAction.req && confirmAction.req.endDate) + ' day(s))? The balance will be deducted.'
          : confirmAction && confirmAction.kind === 'reject'
            ? 'Reject ' + ((confirmAction.req && confirmAction.req.employeeName) || 'this') + '\'s ' + (confirmAction.req && confirmAction.req.type) + ' request? They will be notified.'
            : 'This will cancel your pending leave request. This cannot be undone.'}
        confirmText={confirmAction && confirmAction.kind === 'approve' ? 'Approve' : confirmAction && confirmAction.kind === 'reject' ? 'Reject' : 'Cancel Request'}
        variant={confirmAction && confirmAction.kind === 'approve' ? 'primary' : 'danger'}
        onConfirm={() => { if (!confirmAction) return; if (confirmAction.kind === 'approve') handleApprove(confirmAction.req); else if (confirmAction.kind === 'reject') handleReject(confirmAction.req); else handleCancel(confirmAction.req); }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
