'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RepDashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('representative_uid');
    if (!stored) { router.push('/auth/representative'); return; }
    setLoading(false);
  }, [router]);

  function logout() { sessionStorage.removeItem('representative_uid'); router.push('/auth/representative'); }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--color-pb-rep)' }}></i></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-pb-bg)' }}>
      <header style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-pb-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-pb-rep), #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <i className="fas fa-motorcycle"></i>
          </div>
          <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Field Rescuer</div><div style={{ fontSize: '0.7rem', color: 'var(--color-pb-text-muted)' }}>Rescue App</div></div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}><i className="fas fa-right-from-bracket"></i> Sign out</button>
      </header>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <div className="glass-lg" style={{ padding: 28, marginBottom: 24, background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(251,146,60,0.04))' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-pb-rep)', marginBottom: 8 }}>Field Rescuer Portal</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>Dispatch Desk</h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', marginTop: 8 }}>Accept dispatches and navigate to incidents.</p>
        </div>
      </div>
    </div>
  );
}
