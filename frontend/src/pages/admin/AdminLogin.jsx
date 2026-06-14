import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../lib/adminAuth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(e.target.email.value.trim(), e.target.password.value);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-public admin-auth-page">
      <div className="admin-auth-card">
        <div className="admin-auth-icon"><i className="fas fa-shield-halved" /></div>
        <h1>Admin sign in</h1>
        <p className="lead">PawBandhan command center — manage NGOs, cases, and website content.</p>
        {error ? <div className="admin-error show">{error}</div> : null}
        <form onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="username" />
          </div>
          <div className="admin-field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button type="submit" className="pb-btn pb-btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem' }}>
          <Link to="/" style={{ color: 'var(--pb-brand)', fontWeight: 700 }}>← Back to site</Link>
        </p>
      </div>
    </div>
  );
}
