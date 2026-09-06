import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contractsAPI } from '../../../services/api';
import { Table } from '../../../components/ui/Table/Table';
import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Plus } from 'lucide-react';

export const ContractsList = () => {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await contractsAPI.getContracts();
        setContracts(data);
      } catch (err) {
        setError(err.message || 'Failed to load contracts');
      } finally {
        setIsLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const columns = [
    { key: '_id', label: 'Contract ID', sortable: false, render: (val, row) => row._id || row.id },
    { 
      key: 'employeeName', 
      label: 'Employee', 
      sortable: false,
      render: (val, row) => (
        <div style={{ fontWeight: 500, color: 'var(--color-primary-600)', cursor: 'pointer' }}
             onClick={() => {
               const employeeId = typeof row.employeeId === 'object'
                 ? row.employeeId._id || row.employeeId.id
                 : row.employeeId;
               navigate(`/employees/${employeeId}`);
             }}>
          {val}
        </div>
      )
    },
    { key: 'contractType', label: 'Type', sortable: false },
    { key: 'startDate', label: 'Start Date', sortable: false },
    { 
      key: 'endDate', 
      label: 'End Date', 
      sortable: false,
      render: (val) => val || 'Ongoing'
    },
    { 
      key: 'salary', 
      label: 'Salary', 
      sortable: false,
      render: (val) => `$${(val || 0).toLocaleString()}`
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: false,
      render: (val) => (
        <Badge variant={val === 'Active' ? 'success' : val === 'Expiring' ? 'warning' : 'default'}>
          {val}
        </Badge>
      )
    }
  ];

  if (isLoading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}><p>Loading contracts...</p></div>;
  if (error) return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}><p style={{ color: 'var(--color-error)' }}>{error}</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: 'var(--spacing-1)' }}>Contracts</h1>
          <p style={{ color: 'var(--color-gray-500)' }}>Manage employee contracts and renewals.</p>
        </div>
        <Button onClick={() => navigate('/contracts/new')}>
          <Plus size={16} style={{ marginRight: 8 }} />
          Create Contract
        </Button>
      </div>

      <Table 
        columns={columns} 
        data={contracts}
      />
    </div>
  );
};
