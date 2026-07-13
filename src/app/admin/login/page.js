'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@pawbandhan.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      sessionStorage.setItem('pb_admin_token', data.token);
      sessionStorage.setItem('pb_admin_profile', JSON.stringify(data.admin));
      router.push('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="auth-card glass-lg">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24, textDecoration: 'none', color: 'var(--color-pb-text)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--color-pb-primary), var(--color-pb-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem',
          }}>
            <i className="fas fa-paw"></i>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>PawBandhan</span>
        </Link>
        <h2>Admin Command Center</h2>
        <p>Sign in to manage the rescue network</p>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', borderRadius: 10, marginBottom: 16, fontSize: '0.85rem', color: 'var(--color-pb-danger)' }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>{error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="pb-label">Email</label>
            <input className="pb-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="pb-label">Password</label>
            <input className="pb-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing in…</> : <><i className="fas fa-arrow-right"></i> Sign in</>}
          </button>
        </form>
      </div>
    </div>
  );
}
