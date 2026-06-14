import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { fetchJson } from '../../lib/api';
import '../../styles/rep-app.css';
import '../../styles/shared-portal.css';

function usePartnerGuard(role, dashboardPath) {
  const navigate = useNavigate();
  const [uid, setUid] = useState(sessionStorage.getItem(`${role}_uid`));

  useEffect(() => {
    if (uid) return undefined;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate(`/${role === 'representative' ? 'rep' : role}/login`);
      else {
        sessionStorage.setItem(`${role}_uid`, user.uid);
        setUid(user.uid);
      }
    });
    return () => unsub();
  }, [uid, navigate, role]);

  return uid;
}

function PortalShell({ title, subtitle, children, onLogout }) {
  return (
    <div className="pp-shell">
      <header className="pp-header">
        <Link to="/" className="pp-brand"><i className="fas fa-paw" /> PawBandhan</Link>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="pp-btn pp-btn-ghost" onClick={onLogout}>Sign out</button>
      </header>
      <main className="pp-main">{children}</main>
    </div>
  );
}

export function NgoDashboard() {
  const navigate = useNavigate();
  const uid = usePartnerGuard('ngo', '/ngo/dashboard');
  const [cases, setCases] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!uid) return;
    fetchJson(`/api/ngos/${encodeURIComponent(uid)}/profile`).then(setProfile).catch(() => {});
    fetchJson(`/api/ngos/${encodeURIComponent(uid)}/cases`).then((d) => setCases(Array.isArray(d) ? d : [])).catch(() => {});
  }, [uid]);

  function logout() {
    sessionStorage.removeItem('ngo_uid');
    signOut(auth).finally(() => navigate('/ngo/login'));
  }

  return (
    <PortalShell title="NGO dashboard" subtitle={profile?.name || 'Partner shelter'} onLogout={logout}>
      <div className="pp-card">
        <h2>Active cases ({cases.length})</h2>
        {!cases.length ? <p className="pp-empty">No cases assigned yet.</p> : cases.map((c) => (
          <div key={c.id} className="pp-case-row">
            <strong>{c.animal_type || 'Case'}</strong> — {c.status} — {c.location || '—'}
          </div>
        ))}
      </div>
    </PortalShell>
  );
}

export function DoctorDashboard() {
  const navigate = useNavigate();
  const uid = usePartnerGuard('doctor', '/doctor/dashboard');
  const [cases, setCases] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!uid) return;
    fetchJson(`/api/doctors/${encodeURIComponent(uid)}/full-profile`).then(setProfile).catch(() => {});
    fetchJson(`/api/doctors/${encodeURIComponent(uid)}/cases`).then((d) => setCases(Array.isArray(d) ? d : [])).catch(() => {});
  }, [uid]);

  function logout() {
    sessionStorage.removeItem('doctor_uid');
    signOut(auth).finally(() => navigate('/doctor/login'));
  }

  return (
    <PortalShell title="Veterinarian portal" subtitle={profile?.name ? `Dr. ${profile.name}` : 'Vet desk'} onLogout={logout}>
      {profile?.status === 'pending' ? (
        <div className="pp-card"><p>Your verification is pending. An admin will approve your account.</p></div>
      ) : null}
      <div className="pp-card">
        <h2>Assigned cases ({cases.length})</h2>
        {!cases.length ? <p className="pp-empty">No cases yet.</p> : cases.map((c) => (
          <div key={c.incident_code || c.id} className="pp-case-row">
            <strong>{c.animal_type || 'Case'}</strong> — {c.workflow_status || c.status}
          </div>
        ))}
      </div>
    </PortalShell>
  );
}

export function RepApp() {
  const navigate = useNavigate();
  const uid = usePartnerGuard('representative', '/rep/app');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!uid) return;
    fetchJson(`/api/representatives/${encodeURIComponent(uid)}/profile`).then(setProfile).catch(() => {});
  }, [uid]);

  function logout() {
    sessionStorage.removeItem('representative_uid');
    signOut(auth).finally(() => navigate('/rep/login'));
  }

  return (
    <PortalShell title="Field executive" subtitle={profile?.name || 'Rescue hero'} onLogout={logout}>
      <div className="pp-card">
        <h2>Dispatch desk</h2>
        <p>Accept rescue assignments and update GPS from the mobile field app.</p>
        <p style={{ marginTop: 12, color: 'var(--pb-muted)' }}>Status: {profile?.status || '—'}</p>
      </div>
    </PortalShell>
  );
}
