import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../../../services/api';
import { Table } from '../../../components/ui/Table/Table';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Card, CardContent } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Search, FilterX, Clock } from 'lucide-react';
import './AttendanceList.css';

export const AttendanceList = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchAttendance = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await attendanceAPI.getAttendance();
        setRecords(data);
      } catch (err) {
        setError(err.message || 'Failed to load attendance');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? r.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { key: 'employeeName', label: 'Employee Name', sortable: false },
    { key: 'date', label: 'Date', sortable: false },
    { key: 'checkIn', label: 'Check In', sortable: false },
    { key: 'checkOut', label: 'Check Out', sortable: false, render: (val) => val || '-' },
    { key: 'workingHours', label: 'Hours', sortable: false, render: (val) => val || '-' },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: false,
      render: (val) => (
        <Badge variant={val === 'Present' ? 'success' : val === 'Late' ? 'warning' : val === 'Absent' ? 'error' : 'default'}>
          {val}
        </Badge>
      )
    }
  ];

  const presentToday = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const lateToday = records.filter(r => r.status === 'Late').length;

  if (isLoading) return <div className="attendance-page"><p>Loading attendance...</p></div>;
  if (error) return <div className="attendance-page"><p style={{ color: 'var(--color-error)' }}>{error}</p></div>;

  return (
    <div className="attendance-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Monitor employee daily check-ins and working hours.</p>
        </div>
      </div>

      <div className="attendance-stats-grid">
        <Card>
          <CardContent style={{ padding: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
              <div style={{ padding: 'var(--spacing-2)', backgroundColor: 'var(--color-success-100)', color: 'var(--color-success-700)', borderRadius: '50%' }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{presentToday}</div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>Present Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
              <div style={{ padding: 'var(--spacing-2)', backgroundColor: 'var(--color-warning-100)', color: 'var(--color-warning-700)', borderRadius: '50%' }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{lateToday}</div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>Late Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Input 
            placeholder="Search Employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} className="search-icon" />
        </div>
        
        <Select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { label: 'All Statuses', value: '' },
            { label: 'Present', value: 'Present' },
            { label: 'Late', value: 'Late' },
            { label: 'Absent', value: 'Absent' },
            { label: 'Half Day', value: 'Half Day' }
          ]}
          style={{ width: '200px' }}
        />

        {(search || statusFilter) && (
          <Button variant="ghost" onClick={() => { setSearch(''); setStatusFilter(''); }} style={{ alignSelf: 'flex-start', marginTop: 'var(--spacing-1)' }}>
            <FilterX size={16} style={{ marginRight: 8 }} />
            Clear
          </Button>
        )}
      </div>

      <Table columns={columns} data={filteredRecords} />
    </div>
  );
};
