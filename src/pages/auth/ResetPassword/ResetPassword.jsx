import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { authAPI } from '../../../services/api';

export const ResetPassword = () => {
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    try {
      await authAPI.resetPassword(new URLSearchParams(window.location.search).get('token'), formData.password);
      setSuccess('Password has been reset successfully. You can now log in.');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="login-card">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Input id="password" label="New Password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
          <Input id="confirmPassword" label="Confirm New Password" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
          {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>{error}</p>}
          {success && <p style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>{success}</p>}
          <Button type="submit" variant="primary" size="lg" style={{ width: '100%' }} loading={isLoading}>
            Reset Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
