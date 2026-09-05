import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { payslipsAPI } from '../../../services/api';
import { employeesAPI } from '../../../services/api';
import { Button } from '../../../components/ui/Button/Button';
import { Card, CardContent } from '../../../components/ui/Card/Card';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import './PayslipDetail.css';

export const PayslipDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const slip = await payslipsAPI.getPayslip(id);
        setPayslip(slip);
        const employeeId = typeof slip.employeeId === 'object'
          ? slip.employeeId._id || slip.employeeId.id
          : slip.employeeId;
        const empData = await employeesAPI.getEmployee(employeeId);
        setEmployee(empData);
      } catch (err) {
        setError(err.message || 'Failed to load payslip');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);
  const handleDownload = async () => {
    try {
      const csvString = await payslipsAPI.downloadPayslip(id);
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${payslip.period}-${employee.name.replace(/\\s+/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download payslip');
    }
  };
  if (isLoading) return <div className="payslip-detail-page"><p>Loading...</p></div>;
  if (error) return <div className="payslip-detail-page"><p style={{ color: 'var(--color-error)' }}>{error}</p></div>;
  if (!payslip || !employee) return <div className="payslip-detail-page"><p>Payslip not found.</p></div>;

  return (
    <div className="payslip-detail-page">
      <div className="page-header">
        <Button variant="ghost" onClick={() => navigate('/payslips')}>
          <ArrowLeft size={16} style={{ marginRight: 8 }} /> Back
        </Button>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <Button variant="secondary"><Printer size={16} style={{ marginRight: 8 }} /> Print</Button>
          <Button onClick={handleDownload}><Download size={16} style={{ marginRight: 8 }} /> Download CSV</Button>
        </div>
      </div>

      <Card className="payslip-document">
        <CardContent style={{ padding: 'var(--spacing-8)' }}>
          {/* Header */}
          <div className="payslip-header">
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary-600)' }}>SambaPay Inc.</h2>
              <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>123 Corporate Blvd, NY 10001</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 300, color: 'var(--color-gray-900)' }}>PAYSLIP</h1>
              <p style={{ color: 'var(--color-gray-500)', fontWeight: 600 }}>Period: {payslip.period}</p>
            </div>
          </div>

          <hr style={{ margin: 'var(--spacing-6) 0', borderColor: 'var(--border-color)', borderTop: 'none' }} />

          {/* Employee Details */}
          <div className="payslip-employee-info">
            <div>
              <div className="info-row"><span className="label">Employee Name:</span> <span className="value">{employee.name}</span></div>
              <div className="info-row"><span className="label">Employee ID:</span> <span className="value">{employee._id || employee.id}</span></div>
              <div className="info-row"><span className="label">Department:</span> <span className="value">{employee.department}</span></div>
            </div>
            <div>
              <div className="info-row"><span className="label">Position:</span> <span className="value">{employee.position}</span></div>
              <div className="info-row"><span className="label">Bank Account:</span> <span className="value">**** **** 1234</span></div>
            </div>
          </div>

          {/* Earnings & Deductions */}
          <div className="payslip-breakdown">
            <div className="breakdown-col">
              <h4 className="breakdown-title">Earnings</h4>
              <div className="breakdown-row"><span>Basic Salary</span> <span>${(payslip.basicSalary || 0).toLocaleString()}</span></div>
              <div className="breakdown-row"><span>Allowances</span> <span>${(payslip.allowances || 0).toLocaleString()}</span></div>
              <hr style={{ margin: 'var(--spacing-2) 0' }} />
              <div className="breakdown-row total"><span>Total Earnings</span> <span>${(payslip.grossSalary || 0).toLocaleString()}</span></div>
            </div>

            <div className="breakdown-col">
              <h4 className="breakdown-title">Deductions</h4>
              <div className="breakdown-row"><span>Taxes</span> <span>${(payslip.taxes || 0).toLocaleString()}</span></div>
              <div className="breakdown-row"><span>Standard Deductions</span> <span>${(payslip.deductions || 0).toLocaleString()}</span></div>
              <hr style={{ margin: 'var(--spacing-2) 0' }} />
              <div className="breakdown-row total"><span>Total Deductions</span> <span>${((payslip.taxes || 0) + (payslip.deductions || 0)).toLocaleString()}</span></div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="payslip-net">
            <span style={{ fontSize: 'var(--font-size-lg)' }}>Net Pay:</span>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary-600)' }}>${(payslip.netSalary || 0).toLocaleString()}</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-8)', color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
            This is a computer generated document. No signature is required.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
