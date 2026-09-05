import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  employeesAPI,
  payrollAPI 
} from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Table } from '../../../components/ui/Table/Table';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal/ConfirmationModal';
import { Alert } from '../../../components/ui/Alert/Alert';
import { ArrowLeft, Calculator, Check, DollarSign } from 'lucide-react';
import './PayrunWizard.css';

export const PayrunWizard = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  
  const isNew = id === 'new' || location.pathname === '/payroll/run/new';
  const hasValidPayrunId = Boolean(id && id !== 'undefined' && id !== 'null' && id !== 'new');
  const [payrun, setPayrun] = useState(null);
  
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7));
  const [employees, setEmployees] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (isNew) {
          const allEmps = await employeesAPI.getEmployees();
          const activeEmps = allEmps.filter(e => e.status === 'Active');
          setEmployees(activeEmps);
          setSelectedEmps(activeEmps.map(e => e._id || e.id));
        } else if (!hasValidPayrunId) {
          setError('A valid payrun ID is required. Return to Payroll and open a saved payrun.');
        } else {
          const existing = await payrollAPI.getPayrun(id);
          setPayrun(existing);
        }
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, isNew, hasValidPayrunId]);

  const handleCreate = async () => {
    if (selectedEmps.length === 0) return;
    setIsLoading(true);
    try {
      const newRun = await payrollAPI.createPayrun({ period, employeeIds: selectedEmps });
      const newRunId = newRun?._id || newRun?.id;
      if (!newRunId) {
        throw new Error('The backend created the payrun but returned no payrun ID.');
      }
      navigate(`/payroll/run/${newRunId}`);
    } catch (err) {
      setError(err.message || 'Failed to create payrun');
      addNotification({ message: err.message || 'Failed to create payrun', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const updated = await payrollAPI.calculatePayrun(payrun._id || payrun.id);
      setPayrun(updated);
    } catch (err) {
      setError(err.message || 'Failed to calculate payroll');
      addNotification({ message: err.message || 'Failed to calculate payroll', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    setIsLoading(true);
    setIsConfirmOpen(false);
    try {
      if (confirmAction === 'approve') {
        const updated = await payrollAPI.approvePayrun(payrun._id || payrun.id);
        setPayrun(updated);
        addNotification({ message: `Payrun ${payrun.period} approved and ready for processing.` });
      } else if (confirmAction === 'process') {
        const updated = await payrollAPI.processPayrun(payrun._id || payrun.id);
        setPayrun(updated);
        addNotification({ message: `Payrun ${payrun.period} processed. Payslips generated.` });
      }
    } catch (err) {
      setError(err.message || 'Failed to update payrun');
      addNotification({ message: err.message || 'Failed to update payrun', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isNew) {
    return (
      <div className="payrun-wizard">
        <div className="page-header">
          <Button variant="ghost" onClick={() => navigate('/payroll')}>
            <ArrowLeft size={16} style={{ marginRight: 8 }} /> Back
          </Button>
          <h1 className="page-title" style={{ marginTop: 'var(--spacing-4)' }}>New Payrun</h1>
        </div>

        <Card>
          <CardHeader><CardTitle>1. Select Pay Period</CardTitle></CardHeader>
          <CardContent>
            <Input type="month" label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 200 }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Include Employees</CardTitle></CardHeader>
          <CardContent>
            <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--spacing-4)' }}>Select which active employees to include in this payrun.</p>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-2)' }}>
              {employees.map(emp => (
                <div key={emp._id || emp.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', padding: 'var(--spacing-2)' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedEmps.includes(emp._id || emp.id)} 
                    onChange={(e) => {
                      const empId = emp._id || emp.id;
                      if (e.target.checked) setSelectedEmps([...selectedEmps, empId]);
                      else setSelectedEmps(selectedEmps.filter(id => id !== empId));
                    }}
                  />
                  <span>{emp.name} ({emp.position})</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter style={{ justifyContent: 'flex-end' }}>
            <Button onClick={handleCreate} disabled={selectedEmps.length === 0} loading={isLoading}>Create Payrun Draft</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isLoading && !payrun) return <div className="payrun-wizard"><p>Loading payrun...</p></div>;
  if (error) return <div className="payrun-wizard"><Button variant="ghost" onClick={() => navigate('/payroll')}><ArrowLeft size={16} style={{ marginRight: 8 }} /> Back to Payroll</Button><p style={{ color: 'var(--color-error)' }}>{error}</p></div>;
  if (!payrun) return <div className="payrun-wizard"><p>Payrun not found.</p></div>;

  const tableColumns = [
    { key: 'employeeName', label: 'Employee', sortable: false },
    { key: 'basicSalary', label: 'Basic', sortable: false, render: (v) => `$${(v || 0).toLocaleString()}` },
    { key: 'allowances', label: 'Allowances', sortable: false, render: (v) => `$${(v || 0).toLocaleString()}` },
    { key: 'grossSalary', label: 'Gross', sortable: false, render: (v) => `$${(v || 0).toLocaleString()}` },
    { key: 'deductions', label: 'Deductions', sortable: false, render: (v) => `$${(v || 0).toLocaleString()}` },
    { key: 'taxes', label: 'Taxes', sortable: false, render: (v) => `$${(v || 0).toLocaleString()}` },
    { key: 'netSalary', label: 'Net Pay', sortable: false, render: (v) => <strong style={{color:'var(--color-primary-600)'}}>${(v || 0).toLocaleString()}</strong> }
  ];

  return (
    <div className="payrun-wizard">
      <ConfirmationModal 
        isOpen={isConfirmOpen}
        title={confirmAction === 'approve' ? "Approve Payrun" : "Process Payroll"}
        message={confirmAction === 'approve' 
          ? "Are you sure you want to approve this payrun? Make sure all values have been reviewed." 
          : "Are you absolutely sure you want to process this payroll? This action will mark salaries as paid and generate payslips for all included employees. This action cannot be undone."}
        variant={confirmAction === 'approve' ? 'primary' : 'danger'}
        confirmText={confirmAction === 'approve' ? 'Approve' : 'Process Payroll'}
        onConfirm={handleConfirmAction}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <div className="page-header">
        <Button variant="ghost" onClick={() => navigate('/payroll')}>
          <ArrowLeft size={16} style={{ marginRight: 8 }} /> Back
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-4)' }}>
          <div>
            <h1 className="page-title">Payrun Review: {payrun.period}</h1>
            <p style={{ color: 'var(--color-gray-500)' }}>Status: <strong style={{ color: 'var(--color-gray-900)'}}>{payrun.status}</strong></p>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            {payrun.status === 'Draft' && (
              <Button onClick={handleCalculate} loading={isLoading}><Calculator size={16} style={{marginRight:8}}/> Calculate Payroll</Button>
            )}
            {payrun.status === 'Under Review' && (
              <Button onClick={() => { setConfirmAction('approve'); setIsConfirmOpen(true); }}><Check size={16} style={{marginRight:8}}/> Approve Payrun</Button>
            )}
            {payrun.status === 'Approved' && (
              <Button variant="success" onClick={() => { setConfirmAction('process'); setIsConfirmOpen(true); }}><DollarSign size={16} style={{marginRight:8}}/> Process Payroll</Button>
            )}
          </div>
        </div>
      </div>

      {payrun.status === 'Draft' && (
        <Alert type="info" message="Click 'Calculate Payroll' to let the backend generate authoritative gross, tax, and net values based on employee contracts." />
      )}
      {payrun.status === 'Paid' && (
        <Alert type="success" message="This payrun has been processed successfully. Payslips have been generated." />
      )}

      <Card>
        <CardContent style={{ padding: 'var(--spacing-0)' }}>
          <Table columns={tableColumns} data={payrun.employees || []} />
        </CardContent>
        {payrun.status !== 'Draft' && (
          <CardFooter style={{ display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--color-gray-50)', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Total Gross: ${(payrun.totalGross || 0).toLocaleString()}</div>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>Total Net Liability: ${(payrun.totalNet || 0).toLocaleString()}</div>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

