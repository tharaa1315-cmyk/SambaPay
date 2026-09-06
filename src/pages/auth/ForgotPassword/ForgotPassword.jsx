import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { authAPI } from '../../../services/api';

export const ForgotPassword = () => {
  const [formData, setFormData] = useState({ email: '' });
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
    try {
      await authAPI.forgotPassword(formData.email);
      setSuccess('If an account with that email exists, a reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="login-card">
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Input id="email" label="Email" type="email" placeholder="name@company.com" value={formData.email} onChange={handleChange} required />
          {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>{error}</p>}
          {success && <p style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>{success}</p>}
          <Button type="submit" variant="primary" size="lg" style={{ width: '100%' }} loading={isLoading}>
            Send Reset Link
          </Button>
        </form>
      </CardContent>
      <CardFooter style={{ justifyContent: 'center', display: 'flex', backgroundColor: 'transparent' }}>
        <Link to="/login" style={{ fontSize: 'var(--font-size-sm)' }}>Back to Login</Link>
      </CardFooter>
    </Card>
  );
};
