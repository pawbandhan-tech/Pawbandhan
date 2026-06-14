import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { postJson } from '../../lib/api';
import { setCustomerUid } from '../../lib/session';

export default function CustomerAuth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setCustomerUid(cred.user.uid);
      if (cred.user.displayName) sessionStorage.setItem('portal_customer_name', cred.user.displayName);
      navigate('/dashboard');
    } catch (err) {
      try {
        const data = await postJson('/api/customers/portal-login', { email, accessCode: password });
        if (data.uid) {
          setCustomerUid(data.uid);
          sessionStorage.setItem('portal_customer_name', data.name || 'Customer');
          navigate('/dashboard');
          return;
        }
        setError(data.error || err.message);
      } catch {
        setError(err.message || 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const firstName = e.target.firstName.value.trim();
    const lastName = e.target.lastName.value.trim();
    const email = e.target.email.value.trim();
    const phone = e.target.phone.value.trim();
    const password = e.target.password.value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: `${firstName} ${lastName}`.trim() });
      await postJson('/api/users/register', {
        uid: cred.user.uid,
        firstName,
        lastName,
        email,
        phoneNo: phone,
        role: 'customer'
      });
      setCustomerUid(cred.user.uid);
      sessionStorage.setItem('portal_customer_name', `${firstName} ${lastName}`.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed');
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
        <div className="pb-auth-tabs">
          <button type="button" className={`pb-auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Sign in</button>
          <button type="button" className={`pb-auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => setTab('signup')}>Create account</button>
        </div>

        {error ? <p className="pb-auth-error">{error}</p> : null}

        {tab === 'login' ? (
          <form className="auth-form active" onSubmit={handleLogin}>
            <h2 className="pb-display" style={{ fontSize: '1.5rem', marginBottom: 8 }}>Welcome back</h2>
            <p style={{ color: 'var(--pb-muted)', marginBottom: 20, fontSize: '0.9rem' }}>Report and track animal rescues near you.</p>
            <input type="email" name="email" className="pb-field" placeholder="Email" required />
            <input type="password" name="password" className="pb-field" placeholder="Password or access code" required />
            <button type="submit" className="pb-btn pb-btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form className="auth-form active" onSubmit={handleSignup}>
            <h2 className="pb-display" style={{ fontSize: '1.5rem', marginBottom: 8 }}>Join the network</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input type="text" name="firstName" className="pb-field" placeholder="First name" required />
              <input type="text" name="lastName" className="pb-field" placeholder="Last name" required />
            </div>
            <input type="email" name="email" className="pb-field" placeholder="Email" required />
            <input type="tel" name="phone" className="pb-field" placeholder="Phone" required />
            <input type="password" name="password" className="pb-field" placeholder="Password" required />
            <button type="submit" className="pb-btn pb-btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--pb-muted)' }}>
          <Link to="/#portals" style={{ color: 'var(--pb-brand)', fontWeight: 700 }}>NGO or vet?</Link> Partner portals
        </p>
      </div>
    </div>
  );
}
