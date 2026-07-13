'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NgoDashboardClient() {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('ngo_uid');
    if (!stored) { router.push('/auth/ngo'); return; }
    setUid(stored);
    loadData(stored);
  }, [router]);

  async function loadData(u) {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/ngos/${u}/profile`).catch(() => null),
        fetch(`/api/ngos/${u}/cases`).catch(() => null),
      ]);
      if (pRes?.ok) setProfile(await pRes.json());
      if (cRes?.ok) { const d = await cRes.json(); setCases(Array.isArray(d) ? d : d.cases || []); }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function logout() { sessionStorage.removeItem('ngo_uid'); router.push('/auth/ngo'); }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--color-pb-ngo)' }}></i></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-pb-bg)' }}>
      <header style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-pb-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-pb-ngo), #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <i className="fas fa-building"></i>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>NGO Dashboard</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-pb-text-muted)' }}>{profile?.name || 'Partner'}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}><i className="fas fa-right-from-bracket"></i> Sign out</button>
      </header>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <div className="glass-lg" style={{ padding: 28, marginBottom: 24, background: 'linear-gradient(135deg, rgba(8,145,178,0.08), rgba(6,182,212,0.04))' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-pb-ngo)', marginBottom: 8 }}>NGO Partner</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>Welcome, {profile?.name || 'Partner'}</h1>
        </div>
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>Cases</h3>
          {cases.length === 0 ? <p style={{ color: 'var(--color-pb-text-muted)' }}>No cases assigned yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cases.map((c, i) => (
                <div key={i} style={{ padding: '14px 16px', background: 'rgba(8,145,178,0.03)', borderRadius: 14, border: '1px solid var(--color-pb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div style={{ fontWeight: 700 }}>{c.animalType || 'Animal'} — {c.incidentCode || `#${c.id}`}</div><div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)' }}>{c.status || 'open'}</div></div>
                  <span className="badge badge-teal">{c.workflowStatus || c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
