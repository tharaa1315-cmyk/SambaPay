import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { authAPI } from '../../../services/api';

export const Signup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await authAPI.register(formData.name, formData.email, formData.password, 'EMPLOYEE');
      window.location.href = '/login';
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="login-card">
      <CardHeader>
        <CardTitle>Create an Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Input id="name" label="Full Name" type="text" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
          <Input id="email" label="Work Email" type="email" placeholder="name@company.com" value={formData.email} onChange={handleChange} required />
          <Input id="password" label="Password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
          <Input id="confirmPassword" label="Confirm Password" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
          {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>{error}</p>}
          <Button type="submit" variant="primary" size="lg" style={{ width: '100%' }} loading={isLoading}>
            Sign Up
          </Button>
        </form>
      </CardContent>
      <CardFooter style={{ justifyContent: 'center', display: 'flex', backgroundColor: 'transparent' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </CardFooter>
    </Card>
  );
};
