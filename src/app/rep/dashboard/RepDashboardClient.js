'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/SiteLogo';

export default function RepDashboardClient() {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [profile, setProfile] = useState(null);
  const [rep, setRep] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showKyc, setShowKyc] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinInfo, setCheckinInfo] = useState(null);
  const [kycForm, setKycForm] = useState({ vehicleType: '', vehicleNumber: '', licenseNumber: '' });

  useEffect(() => {
    const stored = sessionStorage.getItem('representative_uid');
    if (!stored) { router.push('/auth/representative'); return; }
    setUid(stored);
    loadAll(stored);
  }, [router]);

  async function loadAll(u) {
    setLoading(true);
    try {
      const [pRes, rRes, cRes] = await Promise.all([
        fetch(`/api/users/${u}/profile`).catch(() => null),
        fetch(`/api/reps/${u}`).catch(() => null),
        fetch(`/api/users/${u}/cases-track`).catch(() => null),
      ]);
      if (pRes?.ok) setProfile(await pRes.json());
      if (rRes?.ok) setRep(await rRes.json());
      if (cRes?.ok) { const d = await cRes.json(); setCases(Array.isArray(d) ? d : d.cases || []); }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    if (rep) setKycForm({ vehicleType: rep.vehicleType || '', vehicleNumber: rep.vehicleNumber || '', licenseNumber: rep.licenseNumber || '' });
  }, [rep]);

  async function handleKycSubmit() {
    if (!uid) return;
    setSubmittingKyc(true);
    try {
      const res = await fetch(`/api/reps/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...kycForm, kycData: { ...kycForm, submittedAt: new Date().toISOString() } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'KYC submission failed');
      setRep(prev => ({ ...prev, ...kycForm, kycData: { ...kycForm, submittedAt: new Date().toISOString() } }));
      showToast('KYC documents submitted successfully!');
      setShowKyc(false);
    } catch (err) { showToast(err.message, 'error'); }
    setSubmittingKyc(false);
  }

  async function handleCheckin() {
    if (!uid) return;
    setCheckingIn(true);
    try {
      let lat = '', lng = '';
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        lat = String(pos.coords.latitude.toFixed(6));
        lng = String(pos.coords.longitude.toFixed(6));
      }

      await fetch(`/api/reps/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: true, lastLat: lat || undefined, lastLng: lng || undefined, lastLocationAt: new Date().toISOString() }),
      });

      setCheckinInfo({ time: new Date().toLocaleTimeString(), lat: lat || 'N/A', lng: lng || 'N/A' });
      setRep(prev => ({ ...prev, isOnline: true, lastLat: lat, lastLng: lng }));
      showToast('Checked in successfully!');
    } catch (err) {
      showToast('Check-in failed. Please allow location access.', 'error');
    }
    setCheckingIn(false);
  }

  function logout() { sessionStorage.removeItem('representative_uid'); router.push('/auth/representative'); }

  const kycStatus = rep?.status === 'active' ? 'verified' : (rep?.status === 'rejected' ? 'rejected' : 'pending');
  const docsSubmitted = rep?.kycData && Object.keys(rep.kycData).length > 0;
  const profileComplete = profile?.name && profile?.phone;
  const steps = [
    { label: 'Account Created', done: true },
    { label: 'Profile Complete', done: !!profileComplete },
    { label: 'KYC Documents Submitted', done: !!docsSubmitted },
    { label: 'Verified', done: kycStatus === 'verified' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--color-pb-rep)' }}></i>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-pb-bg)' }}>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}><i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>{toast.msg}</div>
        </div>
      )}

      <header style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-pb-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SiteLogo size={36} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Field Rescuer</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-pb-text-muted)' }}>{profile?.name || 'Rescuer'}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}><i className="fas fa-right-from-bracket"></i> Sign out</button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* Hero Card */}
        <div className="glass-lg" style={{ padding: 28, marginBottom: 24, background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(251,146,60,0.04))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-pb-rep)', marginBottom: 8 }}>Field Rescuer Portal</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>Welcome, {profile?.name || 'Rescuer'}</h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', marginTop: 8 }}>Accept dispatches and navigate to incidents.</p>
            </div>
            <span className={`badge ${kycStatus === 'verified' ? 'badge-green' : kycStatus === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
              <i className={`fas ${kycStatus === 'verified' ? 'fa-check-circle' : kycStatus === 'rejected' ? 'fa-times-circle' : 'fa-clock'}`}></i>
              {kycStatus === 'verified' ? 'Verified' : kycStatus === 'rejected' ? 'Rejected' : 'Pending Review'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <button className="glass" onClick={handleCheckin} disabled={checkingIn} style={{ padding: '20px 16px', textAlign: 'left', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(249,115,22,0.1)', color: 'var(--color-pb-rep)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <i className={`fas ${checkingIn ? 'fa-spinner fa-spin' : 'fa-location-dot'}`}></i>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{checkingIn ? 'Checking in…' : 'Check In'}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>Mark your availability</div>
          </button>
          <div className="glass" style={{ padding: '20px 16px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: rep?.isOnline ? 'rgba(22,163,74,0.1)' : 'rgba(123,145,153,0.1)', color: rep?.isOnline ? 'var(--color-pb-success)' : 'var(--color-pb-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <i className={`fas ${rep?.isOnline ? 'fa-signal' : 'fa-power-off'}`}></i>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{rep?.isOnline ? 'Online' : 'Offline'}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>Current status</div>
          </div>
          <div className="glass" style={{ padding: '20px 16px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(249,115,22,0.1)', color: 'var(--color-pb-rep)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <i className="fas fa-folder-open"></i>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{cases.length} Missions</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>Assigned cases</div>
          </div>
        </div>

        {/* Tracking Info */}
        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>Tracking Info</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Rep ID</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{rep?.repId || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Tracking ID</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{rep?.trackingId || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: rep?.isOnline ? 'var(--color-pb-success)' : 'var(--color-pb-text-muted)' }}></div>
                <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{rep?.isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Vehicle</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{[rep?.vehicleType, rep?.vehicleNumber].filter(Boolean).join(' — ') || '—'}</div>
            </div>
          </div>
          {checkinInfo && (
            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(22,163,74,0.06)', border: '1px solid var(--color-pb-border)', fontSize: '0.82rem' }}>
              <i className="fas fa-check-circle" style={{ color: 'var(--color-pb-success)', marginRight: 6 }}></i>
              Last check-in at {checkinInfo.time} — GPS: {checkinInfo.lat}, {checkinInfo.lng}
            </div>
          )}
        </div>

        {/* KYC Status */}
        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>KYC Verification</h3>
            {kycStatus !== 'verified' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowKyc(true)}>
                <i className="fas fa-file-upload"></i> Submit KYC
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderBottom: i < steps.length - 1 ? '1px solid var(--color-pb-border)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.done ? 'rgba(27,107,82,0.1)' : 'rgba(123,145,153,0.1)', color: step.done ? 'var(--color-pb-primary)' : 'var(--color-pb-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fas ${step.done ? 'fa-check' : 'fa-circle'}`} style={{ fontSize: step.done ? '0.7rem' : '0.4rem' }}></i>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: step.done ? 'var(--color-pb-text)' : 'var(--color-pb-text-muted)' }}>{step.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cases */}
        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>Assigned Missions</h3>
          {cases.length === 0 ? (
            <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No missions assigned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cases.map((c, i) => (
                <div key={i} style={{ padding: '14px 16px', background: 'rgba(249,115,22,0.03)', borderRadius: 14, border: '1px solid var(--color-pb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(249,115,22,0.1)', color: 'var(--color-pb-rep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-paw" style={{ fontSize: '0.85rem' }}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.animalType || 'Animal'} — {c.incidentCode || `Case #${c.id}`}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{c.status || 'open'}</div>
                    </div>
                  </div>
                  <span className="badge badge-orange">{c.workflowStatus || c.status || 'open'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>Profile</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Name</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{profile?.name || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Email</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{profile?.email || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Phone</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{profile?.phone || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>License</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{rep?.licenseNumber || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KYC Modal */}
      {showKyc && (
        <div className="modal-overlay" onClick={() => setShowKyc(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit KYC Documents</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowKyc(false)}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(249,115,22,0.06)', border: '1px solid var(--color-pb-border)', marginBottom: 16, fontSize: '0.82rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.5 }}>
                <i className="fas fa-info-circle" style={{ color: 'var(--color-pb-rep)', marginRight: 6 }}></i>
                Please provide your vehicle details and upload a copy of your driving license. Verification takes 1-2 business days.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="pb-label">Vehicle Type</label>
                  <select className="pb-select" value={kycForm.vehicleType} onChange={e => setKycForm(f => ({ ...f, vehicleType: e.target.value }))}>
                    <option value="">Select vehicle…</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="scooter">Scooter</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="bicycle">Bicycle</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="pb-label">Vehicle Number</label>
                  <input className="pb-input" value={kycForm.vehicleNumber} onChange={e => setKycForm(f => ({ ...f, vehicleNumber: e.target.value }))} placeholder="Registration number" />
                </div>
                <div>
                  <label className="pb-label">License Number</label>
                  <input className="pb-input" value={kycForm.licenseNumber} onChange={e => setKycForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="Driving license number" />
                </div>
                <button className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, var(--color-pb-rep), #fb923c)' }} onClick={handleKycSubmit} disabled={submittingKyc}>
                  {submittingKyc ? <><i className="fas fa-spinner fa-spin"></i> Submitting…</> : <><i className="fas fa-paper-plane"></i> Submit for Review</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
