import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { payslipsAPI } from '../../../services/api';
import { Table } from '../../../components/ui/Table/Table';
import { Button } from '../../../components/ui/Button/Button';
import { FileText } from 'lucide-react';

export const PayslipsList = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isEmployee = role === 'EMPLOYEE';

  useEffect(() => {
    const fetchPayslips = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await payslipsAPI.getPayslips();
        setPayslips(data);
      } catch (err) {
        setError(err.message || 'Failed to load payslips');
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
      fetchPayslips();
    }
  }, [user, isEmployee]);

  const columns = [
    ...(isEmployee ? [] : [{ key: 'employeeName', label: 'Employee', sortable: false }]),
    { key: 'period', label: 'Pay Period', sortable: false },
    { key: 'grossSalary', label: 'Gross Pay', sortable: false, render: (v) => `$${(v || 0).toLocaleString()}` },
    { key: 'netSalary', label: 'Net Pay', sortable: false, render: (v) => <strong style={{color:'var(--color-primary-600)'}}>${(v || 0).toLocaleString()}</strong> },
    { 
      key: 'generatedAt', 
      label: 'Generated On', 
      sortable: false,
      render: (v) => new Date(v).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/payslips/${row._id || row.id}`)}>
          <FileText size={16} style={{ marginRight: 8 }} />
          View
        </Button>
      )
    }
  ];

  if (isLoading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}><p>Loading payslips...</p></div>;
  if (error) return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}><p style={{ color: 'var(--color-error)' }}>{error}</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: 'var(--spacing-1)' }}>Payslips</h1>
        <p style={{ color: 'var(--color-gray-500)' }}>
          {isEmployee ? 'View and download your payslips.' : 'Manage generated company payslips.'}
        </p>
      </div>

      <div style={{ backgroundColor: 'white', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <Table columns={columns} data={payslips} />
      </div>
    </div>
  );
};
