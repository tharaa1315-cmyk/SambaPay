import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI } from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { Check } from 'lucide-react';
import './EmployeeCreate.css';

const steps = [
  'Personal Information',
  'Employment Information',
  'Salary Information',
  'Bank Information',
  'Working Schedule'
];

export const EmployeeCreate = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    manager: '',
    employmentType: '',
    joiningDate: '',
    status: 'Active',
    salary: ''
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const newEmployee = await employeesAPI.createEmployee({
        ...formData,
        salary: Number(formData.salary) || 0
      });
      navigate(`/employees/${newEmployee._id || newEmployee.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch(currentStep) {
      case 0:
        return (
          <div className="form-step-content">
            <Input id="name" label="Full Name" placeholder="e.g. Jane Doe" value={formData.name} onChange={handleChange} required />
            <Input id="email" label="Work Email" type="email" placeholder="jane.doe@company.com" value={formData.email} onChange={handleChange} required />
            <Input id="phone" label="Phone Number" placeholder="+1 (555) 000-0000" />
            <Input id="address" label="Address" placeholder="123 Main St" />
          </div>
        );
      case 1:
        return (
          <div className="form-step-content">
            <Select 
              id="department" 
              label="Department"
              value={formData.department}
              onChange={handleChange}
              options={[
                { label: 'Select Department', value: '' },
                { label: 'Engineering', value: 'Engineering' },
                { label: 'Marketing', value: 'Marketing' },
                { label: 'HR', value: 'HR' },
                { label: 'Finance', value: 'Finance' }
              ]}
              required
            />
            <Input id="position" label="Job Position" placeholder="e.g. Senior Developer" value={formData.position} onChange={handleChange} required />
            <Input id="manager" label="Manager" placeholder="e.g. John Smith" value={formData.manager} onChange={handleChange} />
            <Select 
              id="employmentType" 
              label="Employment Type"
              value={formData.employmentType}
              onChange={handleChange}
              options={[
                { label: 'Select Type', value: '' },
                { label: 'Full-time', value: 'Full-time' },
                { label: 'Part-time', value: 'Part-time' },
                { label: 'Contract', value: 'Contract' }
              ]}
              required
            />
            <Input id="joiningDate" label="Joining Date" type="date" value={formData.joiningDate} onChange={handleChange} required />
          </div>
        );
      case 2:
        return (
          <div className="form-step-content">
            <Input id="salary" label="Annual Salary (USD)" type="number" placeholder="e.g. 75000" value={formData.salary} onChange={handleChange} required />
            <Input id="bonus" label="Target Bonus (%)" type="number" placeholder="e.g. 10" />
          </div>
        );
      case 3:
        return (
          <div className="form-step-content">
            <Input id="bankName" label="Bank Name" placeholder="e.g. Chase" />
            <Input id="accountName" label="Account Holder Name" placeholder="e.g. Jane Doe" />
            <Input id="accountNumber" label="Account Number" placeholder="••••••••" />
            <Input id="routingNumber" label="Routing Number" placeholder="••••••••" />
          </div>
        );
      case 4:
        return (
          <div className="form-step-content">
            <Select 
              id="schedule" 
              label="Standard Schedule"
              options={[
                { label: 'Standard 9-5 (40 hrs/wk)', value: 'standard' },
                { label: 'Flexible', value: 'flexible' },
                { label: 'Shift Based', value: 'shift' }
              ]}
            />
            <Input id="timeZone" label="Time Zone" defaultValue="America/New_York" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="employee-create-page">
      <div className="page-header">
        <h1 className="page-title">Create New Employee</h1>
        <p className="page-subtitle">Add a new team member to your organization.</p>
      </div>

      <div className="stepper-container">
        {steps.map((step, index) => (
          <div key={index} className={`stepper-item ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}>
            <div className="stepper-circle">
              {index < currentStep ? <Check size={14} /> : index + 1}
            </div>
            <div className="stepper-label">{step}</div>
            {index < steps.length - 1 && <div className="stepper-line" />}
          </div>
        ))}
      </div>

      <Card className="form-card">
        <CardHeader>
          <CardTitle>{steps[currentStep]}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
          {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>{error}</p>}
        </CardContent>
        <CardFooter className="form-card-footer">
          <Button variant="ghost" onClick={() => navigate('/employees')}>Cancel</Button>
          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <Button variant="secondary" onClick={handleBack} disabled={currentStep === 0}>Back</Button>
            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} loading={isSubmitting}>Create Employee</Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
