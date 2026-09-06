import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeesAPI } from '../../../services/api';
import { contractsAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Tabs } from '../../../components/ui/Tabs/Tabs';
import { ArrowLeft, Edit, UserX } from 'lucide-react';
import './EmployeeProfile.css';

export const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const { role, user } = useAuth();

  const employeeId = employee?._id || employee?.id || id;
  const canManageEmployees = ['ADMIN', 'HR_MANAGER'].includes(role);
  const canEdit = canManageEmployees || (role === 'EMPLOYEE' && String(user?.employeeId) === String(employeeId));

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const empData = await employeesAPI.getEmployee(id);
        setEmployee(empData);
        const contractsData = await contractsAPI.getContracts();
        setContracts(contractsData.filter(c => {
          const contractEmployeeId = typeof c.employeeId === 'object'
            ? c.employeeId._id || c.employeeId.id
            : c.employeeId;
          return String(contractEmployeeId) === String(id) || c.employeeName === empData.name;
        }));
      } catch (err) {
        setError(err.message || 'Failed to load employee data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleEdit = () => {
    setSuccess('');
    setError('');
    setIsEditing(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');
    const formData = new FormData(event.currentTarget);
    const updates = Object.fromEntries(formData.entries());
    try {
      const updatedEmployee = await employeesAPI.updateEmployee(employeeId, {
        ...updates,
        salary: Number(updates.salary) || 0
      });
      setEmployee(updatedEmployee);
      setIsEditing(false);
      setSuccess('Employee details updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update employee');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Deactivate ${employee.name}?`)) return;
    setIsDeactivating(true);
    setError('');
    setSuccess('');
    try {
      const result = await employeesAPI.deleteEmployee(employeeId);
      setEmployee((current) => ({ ...current, status: 'Inactive' }));
      setSuccess(result.message || 'Employee deactivated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to deactivate employee');
    } finally {
      setIsDeactivating(false);
    }
  };

  if (isLoading) return <div className="employee-profile-page"><p>Loading...</p></div>;
  if (error) return <div className="employee-profile-page"><p style={{ color: 'var(--color-error)' }}>{error}</p></div>;
  if (!employee) return <div className="employee-profile-page"><p>Employee not found.</p></div>;

  const editContent = (
    <Card>
      <CardContent>
        <form className="employee-edit-form" onSubmit={handleSave}>
          <Input name="name" label="Full Name" defaultValue={employee.name || ''} required />
          <Input name="email" label="Work Email" type="email" defaultValue={employee.email || ''} required />
          <Input name="phone" label="Phone" defaultValue={employee.phone || ''} />
          <Input name="department" label="Department" defaultValue={employee.department || ''} required />
          <Input name="position" label="Position" defaultValue={employee.position || ''} required />
          <Input name="manager" label="Manager" defaultValue={employee.manager || ''} />
          <Select name="employmentType" label="Employment Type" defaultValue={employee.employmentType || 'Full-time'} options={[
            { value: 'Full-time', label: 'Full-time' },
            { value: 'Part-time', label: 'Part-time' },
            { value: 'Contract', label: 'Contract' }
          ]} />
          <Input name="joiningDate" label="Joining Date" type="date" defaultValue={employee.joiningDate ? String(employee.joiningDate).slice(0, 10) : ''} required />
          <Input name="salary" label="Annual Salary" type="number" min="0" defaultValue={employee.salary || 0} />
          <div className="employee-edit-actions">
            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button type="submit" loading={isSaving}>Save changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const overviewContent = (
    <div className="profile-grid">
      <Card>
        <CardContent className="info-card">
          <h4>Job Details</h4>
          <div className="info-row">
            <span className="label">Department:</span>
            <span className="value">{employee.department}</span>
          </div>
          <div className="info-row">
            <span className="label">Position:</span>
            <span className="value">{employee.position}</span>
          </div>
          <div className="info-row">
            <span className="label">Manager:</span>
            <span className="value">{employee.manager}</span>
          </div>
          <div className="info-row">
            <span className="label">Joining Date:</span>
            <span className="value">{employee.joiningDate}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="info-card">
          <h4>Contact & Personal</h4>
          <div className="info-row">
            <span className="label">Email:</span>
            <span className="value">{employee.email}</span>
          </div>
          <div className="info-row">
            <span className="label">Phone:</span>
            <span className="value">+1 (555) 123-4567</span>
          </div>
          <div className="info-row">
            <span className="label">Location:</span>
            <span className="value">Headquarters, NY</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const contractsContent = (
    <Card>
      <CardContent>
        {contracts.length === 0 ? (
          <p style={{ color: 'var(--color-gray-500)', padding: 'var(--spacing-4) 0' }}>No contracts found for this employee.</p>
        ) : (
          <table className="samba-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Salary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c._id || c.id}>
                  <td>{c.contractType}</td>
                  <td>{c.startDate}</td>
                  <td>{c.endDate || 'Ongoing'}</td>
                  <td>${(c.salary || 0).toLocaleString()}</td>
                  <td>
                    <Badge variant={c.status === 'Active' ? 'success' : c.status === 'Expiring' ? 'warning' : 'default'}>
                      {c.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    { id: 'personal', label: 'Personal Info', content: <Card><CardContent>Personal Information details go here.</CardContent></Card> },
    { id: 'contracts', label: 'Contracts', content: contractsContent },
    { id: 'attendance', label: 'Attendance', content: <Card><CardContent>Attendance records go here.</CardContent></Card> },
    { id: 'timeoff', label: 'Time Off', content: <Card><CardContent>Time off balances and requests go here.</CardContent></Card> },
    { id: 'payroll', label: 'Payroll', content: <Card><CardContent>Recent payslips and salary history go here.</CardContent></Card> },
  ];

  return (
    <div className="employee-profile-page">
      <div className="profile-header-actions">
        <Button variant="ghost" onClick={() => navigate('/employees')}>
          <ArrowLeft size={16} style={{ marginRight: 8 }} />
          Back to Employees
        </Button>
        <div className="actions-right" aria-label="Employee actions">
          {canEdit && <Button variant="secondary" onClick={handleEdit} disabled={isDeactivating}>
            <Edit size={16} style={{ marginRight: 8 }} />
            Edit
          </Button>}
          {canManageEmployees && employee.status !== 'Inactive' && <Button variant="danger" onClick={handleDeactivate} loading={isDeactivating}>
            <UserX size={16} style={{ marginRight: 8 }} />
            Deactivate
          </Button>}
        </div>
      </div>

      {error && <div className="employee-feedback employee-feedback--error" role="alert">{error}</div>}
      {success && <div className="employee-feedback employee-feedback--success" role="status">{success}</div>}

      {isEditing && editContent}

      <div className="profile-header-main">
        <div className="profile-avatar">
          {employee.name.charAt(0)}
        </div>
        <div className="profile-title-area">
          <h1 className="profile-name">{employee.name}</h1>
          <div className="profile-meta">
            <span>{employee.position}</span>
            <span className="dot">•</span>
            <span>{employee._id || employee.id}</span>
            <span className="dot">•</span>
            <Badge variant={employee.status === 'Active' ? 'success' : 'info'}>{employee.status}</Badge>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <Tabs tabs={tabs} defaultTab="overview" />
      </div>
    </div>
  );
};
