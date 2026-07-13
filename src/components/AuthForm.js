'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthForm({ role = 'customer', title, subtitle }) {
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roleColors = {
    customer: 'var(--color-pb-primary)',
    ngo: 'var(--color-pb-ngo)',
    doctor: 'var(--color-pb-doctor)',
    representative: 'var(--color-pb-rep)',
  };

  const roleIcons = {
    customer: 'fa-solid fa-paw',
    ngo: 'fa-solid fa-building',
    doctor: 'fa-solid fa-stethoscope',
    representative: 'fa-solid fa-motorcycle',
  };

  const dashboardRoutes = {
    customer: '/dashboard',
    ngo: '/ngo/dashboard',
    doctor: '/doctor/dashboard',
    representative: '/rep/dashboard',
  };

  const sessionKeys = {
    customer: 'customer_uid',
    ngo: 'ngo_uid',
    doctor: 'doctor_uid',
    representative: 'representative_uid',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const apiEndpoint = role === 'customer' ? '/api/auth/customer' : '/api/auth/partner';

    try {
      if (tab === 'login') {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role, action: 'login' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        sessionStorage.setItem(sessionKeys[role], data.uid || data.id);
        if (data.name) sessionStorage.setItem(`${role}_name`, data.name);
        router.push(dashboardRoutes[role]);
      } else {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, phone, role, action: 'register' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        sessionStorage.setItem(sessionKeys[role], data.uid || data.id);
        if (data.name) sessionStorage.setItem(`${role}_name`, data.name);
        router.push(dashboardRoutes[role]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card glass-lg">
      <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24, textDecoration: 'none', color: 'var(--color-pb-text)' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${roleColors[role]}, ${roleColors[role]}aa)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem',
        }}>
          <i className={roleIcons[role]}></i>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>PawBandhan</span>
      </Link>
      <h2>{title || `${role === 'customer' ? 'Sign in to your account' : `Partner Login — ${role.charAt(0).toUpperCase() + role.slice(1)}`}`}</h2>
      <p>{subtitle || 'Access the rescue network dashboard'}</p>

      <div className="auth-tabs">
        <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Sign in</button>
        <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Create account</button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', borderRadius: 10, marginBottom: 16, fontSize: '0.85rem', color: 'var(--color-pb-danger)' }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>{error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tab === 'signup' && (
          <>
            <div>
              <label className="pb-label">Full name</label>
              <input className="pb-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
            </div>
            <div>
              <label className="pb-label">Phone</label>
              <input className="pb-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </>
        )}
        <div>
          <label className="pb-label">Email</label>
          <input className="pb-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div>
          <label className="pb-label">Password</label>
          <input className="pb-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
          {loading ? <><i className="fas fa-spinner fa-spin"></i> Please wait…</> : <><i className="fas fa-arrow-right"></i> {tab === 'login' ? 'Sign in' : 'Create account'}</>}
        </button>
      </form>
    </div>
  );
}
