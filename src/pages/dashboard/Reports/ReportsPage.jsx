import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { employeesAPI, payrollAPI, attendanceAPI, leaveAPI, reportsAPI } from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { Table } from '../../../components/ui/Table/Table';
import { Alert } from '../../../components/ui/Alert/Alert';
import { FileText, Download, FileSpreadsheet, Filter } from 'lucide-react';
import './ReportsPage.css';

const REPORT_TYPES = [
  { value: 'payroll', label: 'Payroll Report' },
  { value: 'employee', label: 'Employee Report' },
  { value: 'attendance', label: 'Attendance Report' },
  { value: 'leave', label: 'Leave Report' },
  { value: 'salary', label: 'Salary Report' },
  { value: 'department', label: 'Department Report' },
  { value: 'tax', label: 'Tax Report' },
];

const DEPARTMENTS = ['All Departments', 'Engineering', 'Marketing', 'HR', 'Finance'];

export const ReportsPage = () => {
  const { role } = useAuth();
  const { addNotification } = useNotification();

  const [reportType, setReportType] = useState('payroll');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('');
  const [employment, setEmployment] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const columns = useMemo(() => {
    if (reportData.length === 0) return [];
    return Object.keys(reportData[0]).map(key => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      sortable: false,
    }));
  }, [reportData]);

  const fetchReportData = async () => {
    setIsLoading(true);
    setError('');
    try {
      let data = [];
      const params = { department, employmentType: employment, startDate, endDate };
      switch (reportType) {
        case 'payroll': {
          const runs = await reportsAPI.getPayrollReport(params);
          data = runs.map(r => ({ ...r, totalGross: `$${(r.totalGross || 0).toLocaleString()}`, totalNet: `$${(r.totalNet || 0).toLocaleString()}` }));
          break;
        }
        case 'employee': {
          data = await reportsAPI.getEmployeeReport(params);
          break;
        }
        case 'attendance': {
          data = await reportsAPI.getAttendanceReport(params);
          break;
        }
        case 'leave': {
          data = await reportsAPI.getLeaveReport(params);
          break;
        }
        case 'salary': {
          const runs = await reportsAPI.getSalaryReport(params);
          data = runs.map(r => ({ ...r, annualSalary: `$${(r.annualSalary || 0).toLocaleString()}`, monthlySalary: `$${(r.monthlySalary || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` }));
          break;
        }
        case 'department': {
          const runs = await reportsAPI.getDepartmentReport();
          data = runs.map(r => ({ ...r, totalSalary: `$${(r.totalSalary || 0).toLocaleString()}`, avgSalary: `$${(r.avgSalary || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` }));
          break;
        }
        case 'tax': {
          const runs = await reportsAPI.getTaxReport(params);
          data = runs.map(r => ({ ...r, grossSalary: `$${(r.grossSalary || 0).toLocaleString()}`, taxes: `$${(r.taxes || 0).toLocaleString()}`, deductions: `$${(r.deductions || 0).toLocaleString()}`, netPay: `$${(r.netPay || 0).toLocaleString()}` }));
          break;
        }
        default:
          data = [];
      }
      setReportData(data);
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await fetchReportData();
    setHasGenerated(true);
    setIsGenerating(false);
  };

  const handleExport = async (format) => {
    setIsExporting(format);
    try {
      if (reportData.length === 0) throw new Error('No data to export');

      const cols = Object.keys(reportData[0]).filter(k => k !== 'id');
      const csvRows = [cols.join(',')];

      reportData.forEach(row => {
        const values = cols.map(col => {
          const val = String(row[col] || '').replace(/"/g, '""');
          return `"${val}"`;
        });
        csvRows.push(values.join(','));
      });

      const csvString = csvRows.join('\\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      addNotification({
        message: `${REPORT_TYPES.find(t => t.value === reportType)?.label || 'Report'} exported successfully.`,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="reports-page">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Generate, review and export business reports.</p>
      </div>

      {/* Filters Panel */}
      <Card>
        <CardHeader>
          <CardTitle><Filter size={16} style={{ marginRight: 8, display: 'inline' }} />Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="reports-filters-grid">
            <Select
              label="Report Type"
              value={reportType}
              onChange={(e) => { setReportType(e.target.value); setHasGenerated(false); }}
              options={REPORT_TYPES}
            />
            <Input label="From Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="To Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <Select
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={DEPARTMENTS.map(d => ({ label: d, value: d === 'All Departments' ? '' : d }))}
            />
            <Select
              label="Employment Type"
              value={employment}
              onChange={(e) => setEmployment(e.target.value)}
              options={[
                { label: 'All Types', value: '' },
                { label: 'Full-time', value: 'Full-time' },
                { label: 'Part-time', value: 'Part-time' },
                { label: 'Contract', value: 'Contract' },
              ]}
            />
          </div>

          <div className="reports-actions">
            <Button onClick={handleGenerate} loading={isGenerating || isLoading}>
              <FileText size={16} style={{ marginRight: 8 }} />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      {hasGenerated && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle>
                {REPORT_TYPES.find(t => t.value === reportType)?.label}
                <span style={{ fontWeight: 400, color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-3)' }}>
                  {reportData.length} record{reportData.length !== 1 ? 's' : ''}
                </span>
              </CardTitle>
              <div className="export-buttons">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={isExporting === 'pdf'}
                  onClick={() => handleExport('pdf')}
                >
                  <FileText size={14} style={{ marginRight: 6 }} />
                  Export PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={isExporting === 'excel'}
                  onClick={() => handleExport('excel')}
                >
                  <FileSpreadsheet size={14} style={{ marginRight: 6 }} />
                  Export Excel
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={isExporting === 'csv'}
                  onClick={() => handleExport('csv')}
                >
                  <Download size={14} style={{ marginRight: 6 }} />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {error ? (
              <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--color-error)' }}>{error}</div>
            ) : reportData.length === 0 ? (
              <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
                No data found for the selected filters.
              </div>
            ) : (
              <Table columns={columns} data={reportData.map((r, i) => ({ ...r, id: r.id || i }))} />
            )}
          </CardContent>
        </Card>
      )}

      {!hasGenerated && (
        <Alert
          type="info"
          title="Configure your report"
          message="Select a report type and date range above, then click 'Generate Report' to view data. You can then export it as PDF, Excel, or CSV."
        />
      )}
    </div>
  );
};
