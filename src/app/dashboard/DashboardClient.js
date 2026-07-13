'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ANIMAL_TYPES = ['Dog', 'Cat', 'Bird', 'Cow', 'Horse', 'Rabbit', 'Goat', 'Sheep', 'Other'];

export default function DashboardClient() {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cases, setCases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [reportForm, setReportForm] = useState({ animalType: '', description: '', location: '', latitude: '', longitude: '' });
  const [reportImages, setReportImages] = useState([]);
  const [reporting, setReporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [liveLocation, setLiveLocation] = useState({ status: 'detecting', lat: '', lng: '', address: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('customer_uid') || sessionStorage.getItem('portal_customer_uid');
    if (!stored) { router.push('/auth/customer'); return; }
    setUid(stored);
    loadDashboard(stored);
  }, [router]);

  useEffect(() => {
    if (!showReport) return;
    setLiveLocation({ status: 'detecting', lat: '', lng: '', address: '' });
    if (!navigator.geolocation) {
      setLiveLocation(prev => ({ ...prev, status: 'unavailable' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setReportForm(f => ({ ...f, latitude: String(lat), longitude: String(lng) }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const addr = data.display_name || '';
          setLiveLocation({ status: 'ready', lat: String(lat.toFixed(6)), lng: String(lng.toFixed(6)), address: addr });
          setReportForm(f => ({ ...f, location: f.location || addr }));
        } catch {
          setLiveLocation({ status: 'ready', lat: String(lat.toFixed(6)), lng: String(lng.toFixed(6)), address: '' });
        }
      },
      () => setLiveLocation({ status: 'denied', lat: '', lng: '', address: '' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [showReport]);

  async function loadDashboard(u) {
    setLoading(true);
    try {
      const [profileRes, casesRes, notifRes] = await Promise.all([
        fetch(`/api/users/${u}/profile`).catch(() => null),
        fetch(`/api/users/${u}/cases-track`).catch(() => null),
        fetch(`/api/users/${u}/notifications`).catch(() => null),
      ]);
      if (profileRes?.ok) { const d = await profileRes.json(); setProfile(d); }
      if (casesRes?.ok) { const d = await casesRes.json(); setCases(Array.isArray(d) ? d : d.cases || []); }
      if (notifRes?.ok) { const d = await notifRes.json(); setNotifications(Array.isArray(d) ? d : d.notifications || []); }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  async function getCurrentLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve({ lat: '', lng: '' }); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: '', lng: '' }),
        { timeout: 5000 }
      );
    });
  }

  async function handleReport(e) {
    e.preventDefault();
    if (!uid) return;
    setReporting(true);
    try {
      const loc = await getCurrentLocation();
      const fd = new FormData();
      fd.append('description', reportForm.description);
      fd.append('animalType', reportForm.animalType);
      fd.append('latitude', reportForm.latitude || loc.lat);
      fd.append('longitude', reportForm.longitude || loc.lng);
      fd.append('location', reportForm.location);
      fd.append('userId', uid);
      reportImages.forEach(img => fd.append('images', img));

      const res = await fetch('/api/incidents/report', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report failed');
      showToast(`Case ${data.incidentCode || ''} created successfully!`);
      setShowReport(false);
      setReportForm({ animalType: '', description: '', location: '', latitude: '', longitude: '' });
      setReportImages([]);
      loadDashboard(uid);
    } catch (err) {
      showToast(err.message, 'error');
    }
    setReporting(false);
  }

  function logout() {
    sessionStorage.removeItem('customer_uid');
    sessionStorage.removeItem('portal_customer_uid');
    sessionStorage.removeItem('portal_customer_name');
    router.push('/auth/customer');
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--color-pb-primary)' }}></i>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-pb-bg)' }}>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}><i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-pb-border)', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-pb-primary), var(--color-pb-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <i className="fas fa-paw"></i>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>PawBandhan</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-pb-text-muted)' }}>Rescue Dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setShowNotifications(true)} style={{ position: 'relative' }}>
            <i className="fas fa-bell"></i>
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: 'var(--color-pb-danger)' }}></span>
            )}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => setShowProfile(true)}>
            <i className="fas fa-user-circle"></i>
          </button>
          <button className="btn btn-ghost btn-sm" onClick={logout}><i className="fas fa-right-from-bracket"></i></button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* Hero Card */}
        <div className="glass-lg" style={{
          padding: '32px 28px', marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(27,107,82,0.08), rgba(212,160,23,0.04))',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-pb-accent)', marginBottom: 8 }}>
            Rescue Dashboard
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', margin: '0 0 8px' }}>
            Welcome back{profile?.name ? `, ${profile.name}` : ''}
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', margin: 0 }}>
            Report an animal emergency, track your cases, and stay connected with the rescue network.
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          <button className="glass" style={{ padding: '20px 16px', textAlign: 'left', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }} onClick={() => setShowReport(true)}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(27,107,82,0.1)', color: 'var(--color-pb-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <i className="fas fa-paw"></i>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Report Rescue</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>Report an emergency</div>
          </button>
          <button className="glass" style={{ padding: '20px 16px', textAlign: 'left', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }} onClick={() => {}}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(212,160,23,0.1)', color: 'var(--color-pb-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <i className="fas fa-folder-open"></i>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>My Cases</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{cases.length} active</div>
          </button>
          <button className="glass" style={{ padding: '20px 16px', textAlign: 'left', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }} onClick={() => setShowProfile(true)}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(37,99,235,0.1)', color: 'var(--color-pb-doctor)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <i className="fas fa-user"></i>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>My Profile</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>Edit your details</div>
          </button>
        </div>

        {/* Cases */}
        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>My Cases</h3>
          {cases.length === 0 ? (
            <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No cases yet. Tap "Report Rescue" to get started.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cases.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(27,107,82,0.03)', borderRadius: 14, border: '1px solid var(--color-pb-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(27,107,82,0.1)', color: 'var(--color-pb-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-paw" style={{ fontSize: '0.85rem' }}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.animalType || 'Animal'} — {c.incidentCode || `Case #${c.id}`}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{c.status || c.workflowStatus || 'open'}</div>
                    </div>
                  </div>
                  <span className="badge badge-green">{c.workflowStatus || c.status || 'open'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReport && (
        <div className="modal-overlay" onClick={() => setShowReport(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Report Animal Rescue</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowReport(false)}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Live Location */}
                <div style={{ padding: '12px 14px', borderRadius: 12, background: liveLocation.status === 'ready' ? 'rgba(27,107,82,0.06)' : liveLocation.status === 'denied' ? 'rgba(220,38,38,0.06)' : 'rgba(212,160,23,0.06)', border: '1px solid var(--color-pb-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <i className={`fas ${liveLocation.status === 'detecting' ? 'fa-spinner fa-spin' : liveLocation.status === 'ready' ? 'fa-location-dot' : 'fa-triangle-exclamation'}`} style={{ color: liveLocation.status === 'ready' ? 'var(--color-pb-primary)' : liveLocation.status === 'denied' ? 'var(--color-pb-danger)' : 'var(--color-pb-accent)', fontSize: '0.85rem' }}></i>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {liveLocation.status === 'detecting' && 'Detecting your location…'}
                      {liveLocation.status === 'ready' && `Location: ${liveLocation.lat}, ${liveLocation.lng}`}
                      {liveLocation.status === 'denied' && 'Location access denied'}
                      {liveLocation.status === 'unavailable' && 'Geolocation not supported'}
                    </span>
                  </div>
                  {liveLocation.address && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-pb-text-muted)', lineHeight: 1.4 }}>{liveLocation.address}</div>
                  )}
                </div>

                <div>
                  <label className="pb-label">Animal Type</label>
                  <select className="pb-select" value={reportForm.animalType} onChange={e => setReportForm(f => ({ ...f, animalType: e.target.value }))} required>
                    <option value="">Select animal…</option>
                    {ANIMAL_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="pb-label">Description</label>
                  <textarea className="pb-textarea" value={reportForm.description} onChange={e => setReportForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the animal's condition…" required />
                </div>
                <div>
                  <label className="pb-label">Landmark (optional)</label>
                  <input className="pb-input" value={reportForm.location} onChange={e => setReportForm(f => ({ ...f, location: e.target.value }))} placeholder="Nearby landmark or address" />
                </div>

                {/* Camera Capture Only */}
                <div>
                  <label className="pb-label">Photo Proof</label>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => setReportImages(prev => [...prev, ...Array.from(e.target.files)])} />
                  <button type="button" className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px', cursor: 'pointer', border: '2px dashed var(--color-pb-border)', borderRadius: 12, fontSize: '0.88rem' }}>
                    <i className="fas fa-camera" style={{ color: 'var(--color-pb-primary)', fontSize: '1.1rem' }}></i>
                    <span>{reportImages.length > 0 ? `Add another photo (${reportImages.length} taken)` : 'Open Camera'}</span>
                  </button>
                  {reportImages.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      {reportImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-pb-border)' }}>
                          <img src={URL.createObjectURL(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={() => setReportImages(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>
                            <i className="fas fa-xmark"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={reporting}>
                  {reporting ? <><i className="fas fa-spinner fa-spin"></i> Submitting…</> : <><i className="fas fa-paper-plane"></i> Submit Report</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh' }}>
            <div className="modal-header">
              <h3>Notifications</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNotifications(false)}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: 20 }}>No notifications yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notifications.map((n, i) => (
                    <div key={i} style={{ padding: '12px 16px', background: n.isRead ? 'transparent' : 'rgba(27,107,82,0.04)', borderRadius: 12, border: '1px solid var(--color-pb-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{n.title}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-secondary)' }}>{n.message}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)', marginTop: 4 }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>My Profile</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowProfile(false)}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label className="pb-label">Name</label><input className="pb-input" defaultValue={profile?.name || ''} /></div>
                <div><label className="pb-label">Email</label><input className="pb-input" defaultValue={profile?.email || ''} disabled /></div>
                <div><label className="pb-label">Phone</label><input className="pb-input" defaultValue={profile?.phone || ''} /></div>
                <div><label className="pb-label">Gender</label><select className="pb-select" defaultValue={profile?.gender || ''}>
                  <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select></div>
                <button className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-save"></i> Save Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
