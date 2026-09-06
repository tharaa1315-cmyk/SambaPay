import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { employeesAPI } from '../../../services/api';
import { Table } from '../../../components/ui/Table/Table';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Plus, Search, FilterX, Edit } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import './EmployeeList.css';

export const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const canManageEmployees = ['ADMIN', 'HR_MANAGER'].includes(role);

  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await employeesAPI.getEmployees();
        setEmployees(data);
        if (location.state?.updatedEmployee) {
          setEmployees((current) => current.map((employee) => (
            String(employee._id || employee.id) === String(location.state.updatedEmployee._id || location.state.updatedEmployee.id)
              ? location.state.updatedEmployee
              : employee
          )));
          window.history.replaceState({}, document.title);
        }
      } catch (err) {
        setError(err.message || 'Failed to load employees');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, [location.state]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    return employees
      .filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || 
                              emp._id?.toLowerCase().includes(search.toLowerCase()) ||
                              emp.id?.toLowerCase().includes(search.toLowerCase());
        const matchesDept = departmentFilter ? emp.department === departmentFilter : true;
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return sortDir === 'asc' ? -1 : 1;
        if (a[sortKey] > b[sortKey]) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [employees, search, departmentFilter, sortKey, sortDir]);

  const columns = [
    { key: '_id', label: 'ID', sortable: true, render: (val, row) => row._id || row.id },
    { 
      key: 'name', 
      label: 'Employee Name', 
      sortable: true,
      render: (val, row) => (
        <div style={{ fontWeight: 500, color: 'var(--color-primary-600)', cursor: 'pointer' }}
             onClick={() => navigate(`/employees/${row._id || row.id}`)}>
          {val}
        </div>
      )
    },
    { key: 'department', label: 'Department', sortable: true },
    { key: 'position', label: 'Job Position', sortable: true },
    { key: 'employmentType', label: 'Type', sortable: true },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true,
      render: (val) => (
        <Badge variant={val === 'Active' ? 'success' : val === 'On Leave' ? 'info' : 'default'}>
          {val}
        </Badge>
      )
    },
    ...(canManageEmployees ? [{
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Button variant="ghost" onClick={() => navigate(`/employees/${row._id || row.id}`)} aria-label={`Edit ${row.name}`}>
          <Edit size={16} style={{ marginRight: 6 }} />
          Edit
        </Button>
      )
    }] : [])
  ];

  const clearFilters = () => {
    setSearch('');
    setDepartmentFilter('');
  };

  if (isLoading) return <div className="employee-list-page"><p>Loading employees...</p></div>;
  if (error) return <div className="employee-list-page"><p style={{ color: 'var(--color-error)' }}>{error}</p></div>;

  return (
    <div className="employee-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your organization's workforce.</p>
        </div>
        <Button onClick={() => navigate('/employees/new')}>
          <Plus size={16} style={{ marginRight: 8 }} />
          Add Employee
        </Button>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Input 
            placeholder="Search by Name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} className="search-icon" />
        </div>
        
        <Select 
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          options={[
            { label: 'All Departments', value: '' },
            { label: 'Engineering', value: 'Engineering' },
            { label: 'Marketing', value: 'Marketing' },
            { label: 'HR', value: 'HR' },
            { label: 'Finance', value: 'Finance' },
          ]}
          style={{ width: '200px' }}
        />

        {(search || departmentFilter) && (
          <Button variant="ghost" onClick={clearFilters} style={{ alignSelf: 'flex-start', marginTop: 'var(--spacing-1)' }}>
            <FilterX size={16} style={{ marginRight: 8 }} />
            Clear Filters
          </Button>
        )}
      </div>

      <Table 
        columns={columns} 
        data={filteredAndSortedData} 
        sortKey={sortKey} 
        sortDirection={sortDir} 
        onSort={handleSort}
      />
    </div>
  );
};
