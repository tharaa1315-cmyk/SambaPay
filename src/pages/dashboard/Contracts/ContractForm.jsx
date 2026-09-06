import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI, contractsAPI } from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';

export const ContractForm = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    employeeId: '',
    contractType: 'Full-time',
    startDate: '',
    endDate: '',
    salary: ''
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoadingEmployees(true);
      try {
        const data = await employeesAPI.getEmployees();
        setEmployees(data);
      } catch (err) {
        setError(err.message || 'Failed to load employees');
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const employee = employees.find(emp => (emp._id || emp.id) === formData.employeeId);
      if (!employee) {
        setError('Please select an employee');
        return;
      }
      await contractsAPI.createContract({
        employeeId: employee._id || employee.id,
        employeeName: employee.name,
        contractType: formData.contractType,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        salary: Number(formData.salary) || 0,
        status: 'Active',
      });
      navigate('/contracts');
    } catch (err) {
      setError(err.message || 'Failed to create contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingEmployees) return <div style={{ maxWidth: '600px', margin: '0 auto' }}><p>Loading employees...</p></div>;
  if (error) return <div style={{ maxWidth: '600px', margin: '0 auto' }}><p style={{ color: 'var(--color-error)' }}>{error}</p></div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--spacing-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>Create Contract</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="contract-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <Select 
              id="employeeId" 
              label="Select Employee"
              value={formData.employeeId}
              onChange={handleChange}
              options={[
                { label: 'Select Employee', value: '' },
                ...employees.map(emp => ({ label: `${emp.name} (${emp._id || emp.id})`, value: emp._id || emp.id }))
              ]}
              required
            />
            
            <Select 
              id="contractType" 
              label="Contract Type"
              value={formData.contractType}
              onChange={handleChange}
              options={[
                { label: 'Indefinite (Full-time)', value: 'Indefinite' },
                { label: 'Fixed Term', value: 'Fixed Term' },
                { label: 'Part-time', value: 'Part-time' },
                { label: 'Freelance / Contractor', value: 'Contract' }
              ]}
              required
            />

            <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
              <div style={{ flex: 1 }}>
                <Input id="startDate" label="Start Date" type="date" value={formData.startDate} onChange={handleChange} required />
              </div>
              <div style={{ flex: 1 }}>
                <Input id="endDate" label="End Date (Optional)" type="date" value={formData.endDate} onChange={handleChange} />
              </div>
            </div>

            <Input id="salary" label="Annual Salary (USD)" type="number" placeholder="e.g. 75000" value={formData.salary} onChange={handleChange} required />
          </form>
        </CardContent>
        <CardFooter style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-3)' }}>
          <Button variant="ghost" onClick={() => navigate('/contracts')}>Cancel</Button>
          <Button form="contract-form" type="submit" loading={isSubmitting}>Create Contract</Button>
        </CardFooter>
      </Card>
    </div>
  );
};
