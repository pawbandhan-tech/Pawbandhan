import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { postJson } from '../../lib/api';

function PartnerAuthForm({ title, role, dashboardPath, registerPath }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, e.target.email.value.trim(), e.target.password.value);
      sessionStorage.setItem(`${role}_uid`, cred.user.uid);
      navigate(dashboardPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const name = e.target.name.value.trim();
    const email = e.target.email.value.trim();
    const phone = e.target.phone.value.trim();
    const password = e.target.password.value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await postJson('/api/users/register', {
        uid: cred.user.uid,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' '),
        email,
        phoneNo: phone,
        role
      });
      sessionStorage.setItem(`${role}_uid`, cred.user.uid);
      navigate(dashboardPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-public pb-auth-page">
      <div className="pb-auth-card">
        <Link to="/" className="pb-brand" style={{ marginBottom: 24 }}>
          <span className="pb-brand-icon"><i className="fas fa-paw" /></span> PawBandhan
        </Link>
        <h2 className="pb-display" style={{ fontSize: '1.5rem', marginBottom: 8 }}>{title}</h2>
        <div className="pb-auth-tabs">
          <button type="button" className={`pb-auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Sign in</button>
          <button type="button" className={`pb-auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => setTab('signup')}>Register</button>
        </div>
        {error ? <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p> : null}
        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <input type="email" name="email" className="pb-field" placeholder="Email" required />
            <input type="password" name="password" className="pb-field" placeholder="Password" required />
            <button type="submit" className="pb-btn pb-btn-primary" style={{ width: '100%' }} disabled={loading}>Sign in</button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <input type="text" name="name" className="pb-field" placeholder="Full name" required />
            <input type="email" name="email" className="pb-field" placeholder="Email" required />
            <input type="tel" name="phone" className="pb-field" placeholder="Phone" required />
            <input type="password" name="password" className="pb-field" placeholder="Password" required />
            <button type="submit" className="pb-btn pb-btn-primary" style={{ width: '100%' }} disabled={loading}>Create account</button>
          </form>
        )}
        <p style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to={registerPath || '/'} style={{ color: 'var(--pb-brand)', fontWeight: 700 }}>← Back</Link>
        </p>
      </div>
    </div>
  );
}

export function NgoAuth() {
  return <PartnerAuthForm title="NGO partner sign in" role="ngo" dashboardPath="/ngo/dashboard" />;
}

export function DoctorAuth() {
  return <PartnerAuthForm title="Veterinarian sign in" role="doctor" dashboardPath="/doctor/dashboard" />;
}

export function RepAuth() {
  return <PartnerAuthForm title="Field executive sign in" role="representative" dashboardPath="/rep/app" />;
}
