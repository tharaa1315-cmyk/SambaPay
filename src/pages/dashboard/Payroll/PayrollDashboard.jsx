import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { payrollAPI } from '../../../services/api';
import { Table } from '../../../components/ui/Table/Table';
import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Plus } from 'lucide-react';

export const PayrollDashboard = () => {
  const [payruns, setPayruns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPayruns = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await payrollAPI.getPayroll();
        setPayruns(data);
      } catch (err) {
        setError(err.message || 'Failed to load payruns');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPayruns();
  }, []);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Draft': return 'default';
      case 'Under Review': return 'warning';
      case 'Approved': return 'info';
      case 'Paid': return 'success';
      default: return 'default';
    }
  };

  const columns = [
    { key: '_id', label: 'Payrun ID', sortable: false, render: (val, row) => row._id || row.id },
    { key: 'period', label: 'Pay Period', sortable: false },
    { 
      key: 'totalGross', 
      label: 'Total Gross', 
      sortable: false,
      render: (val) => `$${(val || 0).toLocaleString()}`
    },
    { 
      key: 'totalNet', 
      label: 'Total Net', 
      sortable: false,
      render: (val) => `$${(val || 0).toLocaleString()}`
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: false,
      render: (val) => <Badge variant={getStatusBadge(val)}>{val}</Badge>
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/payroll/run/${row._id || row.id}`)}>
          View / Manage
        </Button>
      )
    }
  ];

  if (isLoading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}><p>Loading payroll...</p></div>;
  if (error) return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}><p style={{ color: 'var(--color-error)' }}>{error}</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: 'var(--spacing-1)' }}>Payroll</h1>
          <p style={{ color: 'var(--color-gray-500)' }}>Manage and process company payruns.</p>
        </div>
        <Button onClick={() => navigate('/payroll/run/new')}>
          <Plus size={16} style={{ marginRight: 8 }} />
          Create Payrun
        </Button>
      </div>

      <div style={{ backgroundColor: 'white', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <Table columns={columns} data={payruns} />
      </div>
    </div>
  );
};
