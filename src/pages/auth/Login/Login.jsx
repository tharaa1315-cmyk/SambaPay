import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { authAPI } from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setIsSubmitting(true);

    try {
      await login(demoEmail, demoPassword);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="login-card">
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-1)' }}>
          Please log in to your account
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ backgroundColor: 'var(--color-error-100)', color: 'var(--color-error-700)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-sm)' }}>
              {error}
            </div>
          )}

          <Input
            label="Work Email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-700)', cursor: 'pointer' }}>
              <input type="checkbox" style={{ marginRight: 'var(--spacing-2)' }} />
              Remember me
            </label>
            <Link to="/forgot-password" style={{ fontSize: 'var(--font-size-sm)' }}>
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" style={{ width: '100%' }} loading={isSubmitting}>
            Log In
          </Button>

          <div style={{ marginTop: 'var(--spacing-6)', padding: 'var(--spacing-4)', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: 'var(--spacing-3)', textAlign: 'center' }}>Demo Accounts (1-Click Login)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleDemoLogin('sarah.connor@company.com', 'password123')}
              >
                Log In as Admin
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleDemoLogin('evan.wright@company.com', 'password123')}
              >
                Log In as HR Manager
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleDemoLogin('fiona.gallagher@company.com', 'password123')}
              >
                Log In as Payroll Manager
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleDemoLogin('alice.smith@company.com', 'password123')}
              >
                Log In as Employee
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter style={{ justifyContent: 'center', display: 'flex', backgroundColor: 'transparent' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </CardFooter>
    </Card>
  );
};
