import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { fetchJson } from '../../lib/api';
import '../../styles/shared-portal.css';

function usePartnerGuard(role) {
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

function PortalShell({ title, subtitle, children, onLogout, themeClass = 'ngo-shell' }) {
  return (
    <div className={`pp-shell ${themeClass}`} style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <header className={`pp-header ${themeClass === 'ngo-shell' ? 'ngo-header' : themeClass === 'doctor-shell' ? 'doctor-header' : 'rep-header'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" className="pp-brand" style={{ fontSize: '1.4rem', fontWeight: 800, textDecoration: 'none' }}>
            <i className="fas fa-paw" /> PawBandhan
          </Link>
          <div style={{ borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: '16px' }}>
            <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{title}</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>{subtitle}</p>
          </div>
        </div>
        <button type="button" className="pp-btn pp-btn-ghost" onClick={onLogout} style={{ borderRadius: '12px', padding: '10px 20px', fontWeight: 700 }}>
          <i className="fas fa-sign-out-alt" /> Sign out
        </button>
      </header>
      <main className="pp-main" style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  );
}

export function NgoDashboard() {
  const navigate = useNavigate();
  const uid = usePartnerGuard('ngo');
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
    <PortalShell title="NGO coordination hub" subtitle={profile?.name || 'Partner shelter'} onLogout={logout} themeClass="ngo-shell">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="ngo-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ngo-brand)' }}>Operational Status</span>
          <strong style={{ fontSize: '1.5rem' }}>Active Desk</strong>
        </div>
        <div className="ngo-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ngo-brand)' }}>Assigned Cases</span>
          <strong style={{ fontSize: '1.5rem' }}>{cases.length} Rescues</strong>
        </div>
        <div className="ngo-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ngo-brand)' }}>Verified Shelter</span>
          <strong style={{ fontSize: '1.5rem' }}>Mumbai East</strong>
        </div>
      </div>

      <div className="ngo-card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-list-check" /> Active NGO Triage Desk
        </h2>
        {!cases.length ? (
          <p className="pp-empty" style={{ color: '#666' }}>No active cases assigned yet. Awaiting alerts.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cases.map((c) => (
              <div key={c.id} className="pp-case-row" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(6, 95, 70, 0.03)', border: '1px solid rgba(6, 95, 70, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--ngo-brand)' }}>{c.animal_type || 'Case'} Emergency</strong>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}><i className="fas fa-map-pin" /> {c.location || 'Reported Location'}</div>
                </div>
                <span style={{ padding: '6px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', background: '#d1fae5', color: '#065f46' }}>
                  {c.status || 'Assigned'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}

export function DoctorDashboard() {
  const navigate = useNavigate();
  const uid = usePartnerGuard('doctor');
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
    <PortalShell title="Veterinarian Clinical Desk" subtitle={profile?.name ? `Dr. ${profile.name}` : 'Vet desk'} onLogout={logout} themeClass="doctor-shell">
      {profile?.status === 'pending' ? (
        <div className="doctor-card" style={{ marginBottom: '24px', background: '#eff6ff', borderColor: '#bfdbfe' }}>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--doc-brand)' }}><i className="fas fa-stethoscope" /> Verification status: Pending Admin Review</p>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="doctor-card" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dbeafe', color: 'var(--doc-brand)', display: 'grid', placeItems: 'center', fontSize: '1.5rem', margin: '0 auto 16px' }}>
              <i className="fas fa-user-md" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Dr. {profile?.name || 'Veterinarian'}</h3>
            <p style={{ fontSize: '0.85rem', color: '#555', margin: '4px 0 16px' }}>Registered Practitioner</p>
            <span style={{ background: '#d1fae5', color: '#065f46', padding: '6px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800 }}>ON DUTY</span>
          </div>
        </div>

        <div className="doctor-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--doc-brand)' }}>
            <i className="fas fa-heart-pulse" /> Assigned Patients & Treatment Queue ({cases.length})
          </h2>
          {!cases.length ? (
            <p className="pp-empty" style={{ color: '#666' }}>No patients assigned in this clinic block.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cases.map((c) => (
                <div key={c.incident_code || c.id} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(29, 78, 216, 0.03)', border: '1px solid rgba(29, 78, 216, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Patient: {c.animal_type || 'Animal'}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Case ID: {c.incident_code || 'N/A'}</div>
                  </div>
                  <span style={{ padding: '6px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, background: '#dbeafe', color: 'var(--doc-brand)' }}>
                    {c.workflow_status || c.status || 'Treated'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

export function RepApp() {
  const navigate = useNavigate();
  const uid = usePartnerGuard('representative');
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
    <PortalShell title="Active Dispatch Unit" subtitle={profile?.name || 'Rescue hero'} onLogout={logout} themeClass="rep-shell">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="rep-card" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: '24px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.15)', color: 'var(--rep-brand)', display: 'grid', placeItems: 'center', fontSize: '1.8rem', margin: '0 auto 20px' }}>
            <i className="fas fa-motorcycle" />
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Field Dispatch Desk</h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, maxWidth: '360px', margin: '0 auto 24px' }}>
            Accept real-time rescue coordinates, update transit status, and track GPS routes from the active field dashboard.
          </p>
          <div style={{ background: '#0f172a', border: '1px solid var(--rep-border)', padding: '16px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'block' }} />
            <strong style={{ fontSize: '0.85rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Duty Status: {profile?.status || 'Active'}</strong>
          </div>
        </div>

        <div className="rep-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--rep-brand)' }}><i className="fas fa-satellite-dish" /> Triage Signal</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>Assigning near your current perimeter. Keep this terminal open for dispatch alerts.</p>
        </div>
      </div>
    </PortalShell>
  );
}
