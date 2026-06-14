import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { fetchJson, postJson } from '../../lib/api';
import {
  applyProfile,
  clearCustomerSession,
  displayName,
  getCustomerUid,
  getProfileFromSession,
  initials,
  setCustomerUid
} from '../../lib/session';
import '../../styles/customer-portal.css';
import '../../styles/customer-dashboard.css';
import '../../styles/customer-dashboard-v2.css';
import '../../styles/customer-rescue-mobile.css';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [uid, setUid] = useState(getCustomerUid());
  const [name, setName] = useState(getProfileFromSession().name || 'Guest');
  const [stats, setStats] = useState({});
  const [cases, setCases] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(getProfileFromSession());
  const [saveStatus, setSaveStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [detectedAnimal, setDetectedAnimal] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captureRef = useRef(null);

  const loadProfile = useCallback(async (customerUid) => {
    if (!customerUid || customerUid === 'demo') return;
    try {
      const p = await fetchJson(`/api/customers/${encodeURIComponent(customerUid)}/profile`);
      applyProfile(p);
      if (p.name) setName(p.name);
      setProfile({
        name: p.name || '',
        phone: p.phone || '',
        email: p.email || '',
        gender: p.gender || ''
      });
    } catch { /* optional */ }
  }, []);

  const loadCases = useCallback(async (customerUid) => {
    if (!customerUid) return;
    try {
      const data = await fetchJson(`/api/users/${encodeURIComponent(customerUid)}/cases-track`);
      setCases(Array.isArray(data) ? data : []);
    } catch {
      setCases([]);
    }
  }, []);

  const loadNotifs = useCallback(async (customerUid) => {
    if (!customerUid) return;
    try {
      const data = await fetchJson(`/api/users/${encodeURIComponent(customerUid)}/notifications`);
      setNotifs(Array.isArray(data) ? data : []);
    } catch {
      setNotifs([]);
    }
  }, []);

  useEffect(() => {
    fetchJson('/api/stats').then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    let current = getCustomerUid();
    if (current) {
      setUid(current);
      loadProfile(current);
      loadCases(current);
      loadNotifs(current);
      return undefined;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/auth/customer');
        return;
      }
      current = user.uid;
      setCustomerUid(current);
      setUid(current);
      loadProfile(current);
      loadCases(current);
      loadNotifs(current);
    });
    return () => unsub();
  }, [navigate, loadProfile, loadCases, loadNotifs]);

  async function saveProfile(e) {
    e.preventDefault();
    if (!profile.name.trim()) {
      setSaveStatus('Please enter your name');
      return;
    }
    setSaving(true);
    setSaveStatus('Saving…');
    try {
      const data = await postJson(
        `/api/customers/${encodeURIComponent(uid)}/profile`,
        { name: profile.name, phone: profile.phone, gender: profile.gender || null, email: profile.email || null },
        { timeoutMs: 20000 }
      );
      applyProfile(data);
      setName(data.name || profile.name);
      if (auth.currentUser) {
        try { await updateProfile(auth.currentUser, { displayName: data.name }); } catch { /* optional */ }
      }
      setSaveStatus('Profile saved');
      setTimeout(() => { setProfileOpen(false); setSaveStatus(''); }, 600);
    } catch (err) {
      setSaveStatus(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function openCamera() {
    setCameraOpen(true);
    setDetectedAnimal('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setDetectedAnimal('Animal');
      setCameraOpen(false);
      setReportOpen(true);
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }

  function captureAndReport() {
    const video = videoRef.current;
    const canvas = captureRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0);
    }
    setDetectedAnimal('Animal');
    closeCamera();
    setReportOpen(true);
  }

  async function submitReport() {
    if (!uid) return;
    setReportSubmitting(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000 });
      });
      const fd = new FormData();
      fd.append('uid', uid);
      fd.append('animal_type', detectedAnimal || 'Animal');
      fd.append('description', reportDesc || 'Emergency rescue report');
      fd.append('latitude', String(pos.coords.latitude));
      fd.append('longitude', String(pos.coords.longitude));
      const canvas = captureRef.current;
      if (canvas) {
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
        if (blob) fd.append('images', blob, 'rescue.jpg');
      }
      const res = await fetch('/api/incidents/report', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report failed');
      setReportOpen(false);
      setReportDesc('');
      loadCases(uid);
      alert(`Rescue reported! Case ID: ${data.incident_code || data.incidentCode || 'submitted'}`);
    } catch (err) {
      alert(err.message || 'Could not submit report. Allow location and try again.');
    } finally {
      setReportSubmitting(false);
    }
  }

  function logout() {
    clearCustomerSession();
    signOut(auth).finally(() => navigate('/auth/customer'));
  }

  const unread = notifs.filter((n) => !n.is_read).length;
  const fmt = (n) => {
    const x = Number(n) || 0;
    return x >= 1000 ? `${(x / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(x);
  };

  return (
    <div className="pb-portal pb-customer">
      <header className="cd-header">
        <div className="cd-header-inner">
          <Link to="/" className="cd-brand">
            <span className="cd-brand-icon"><i className="fas fa-paw" /></span>
            <span><strong>PawBandhan</strong><small>Customer portal</small></span>
          </Link>
          <div className="cd-header-actions">
            <button type="button" className="cd-btn-icon" onClick={() => { setNotifOpen((o) => !o); loadNotifs(uid); }} aria-label="Notifications">
              <i className="fas fa-bell" />
              {unread > 0 ? <span className="pb-notif-badge show">{unread > 9 ? '9+' : unread}</span> : null}
            </button>
            <button type="button" className="cd-user-chip" onClick={() => setProfileOpen(true)}>
              <div className="cd-user-avatar">{initials(name)}</div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{displayName(name)}</span>
            </button>
            <button type="button" className="cd-btn-logout" onClick={logout}><i className="fas fa-right-from-bracket" /> Sign out</button>
          </div>
        </div>
      </header>

      <div className={`pb-notif-drawer${notifOpen ? ' open' : ''}`}>
        <header>
          <h3><i className="fas fa-bell" /> Notifications</h3>
          <button type="button" onClick={() => setNotifOpen(false)}>&times;</button>
        </header>
        <div className="pb-notif-list">
          {!notifs.length ? <p style={{ padding: 20, color: 'var(--pb-muted)' }}>No notifications yet</p> : notifs.map((n) => (
            <div key={n.id} className={`pb-notif-item${n.is_read ? '' : ' unread'}`}>
              <strong>{n.title || 'Update'}</strong>
              <p>{n.message}</p>
            </div>
          ))}
        </div>
      </div>

      <main className="cd-main page-wrap">
        <section className="cd-hero-card">
          <div className="cd-hero-top">
            <div className="cd-hero-avatar">{initials(name)}</div>
            <div className="cd-hero-text">
              <p className="cd-hero-label">Your rescue hub</p>
              <h1>Hi, <em>{displayName(name).split(' ')[0]}</em> 🐾</h1>
              <p className="cd-hero-sub">Report injured animals and track every rescue step.</p>
            </div>
            <button type="button" className="cd-btn-profile" onClick={() => setProfileOpen(true)}><i className="fas fa-user-pen" /> Profile</button>
          </div>
          <div className="cd-hero-stats">
            <div className="cd-hero-stat"><strong>{fmt(stats.totalRescues)}</strong> Rescues</div>
            <div className="cd-hero-stat"><strong>{fmt(stats.totalNGOs)}</strong> NGOs</div>
            <div className="cd-hero-stat"><strong>{fmt(stats.totalRiders)}</strong> Heroes</div>
            <div className="cd-hero-stat"><strong>{fmt(stats.totalDoctors)}</strong> Vets</div>
          </div>
        </section>

        <div className="cd-quick-grid">
          <button type="button" className="cd-qbtn cd-qbtn-emergency" onClick={openCamera}>
            <span className="cd-qicon"><i className="fas fa-camera" /></span>
            <div><h3>Report emergency</h3><p>Camera capture + GPS dispatch</p></div>
            <i className="fas fa-chevron-right" style={{ marginLeft: 'auto', opacity: 0.8 }} />
          </button>
          <button type="button" className="cd-qbtn" onClick={() => loadCases(uid)}>
            <span className="cd-qicon"><i className="fas fa-route" /></span>
            <strong>Track rescues</strong><span>Live timeline</span>
          </button>
          <button type="button" className="cd-qbtn" onClick={() => setProfileOpen(true)}>
            <span className="cd-qicon"><i className="fas fa-id-card" /></span>
            <strong>My profile</strong><span>Name &amp; phone</span>
          </button>
          <button type="button" className="cd-qbtn" onClick={() => setNotifOpen(true)}>
            <span className="cd-qicon"><i className="fas fa-bell" /></span>
            <strong>Alerts</strong><span>Case updates</span>
          </button>
        </div>

        <div className="cd-cases-panel">
          <div className="cd-section-head">
            <h2>Your rescue cases</h2>
            <button type="button" onClick={() => loadCases(uid)}><i className="fas fa-rotate" /> Refresh</button>
          </div>
          {!cases.length ? (
            <div className="empty-cases-card">
              <i className="fas fa-paw" />
              <h3>No rescues yet</h3>
              <p>Report an injured animal to see live tracking.</p>
              <button type="button" className="btn-track-primary" onClick={openCamera}>Report emergency</button>
            </div>
          ) : cases.map((c) => (
            <article key={c.incident_code || c.id} className="cd-case-card track-card">
              <div className="cd-case-icon"><i className="fas fa-paw" /></div>
              <div className="cd-case-body">
                <h4>{c.animal_type || 'Animal'} rescue</h4>
                <p>{c.location || c.description || 'Location pending'}</p>
                <div className="cd-case-meta"><i className="fas fa-hashtag" /> {c.incident_code}</div>
              </div>
              <span className={`cd-case-pill ${c.workflow_status === 'resolved' ? 'pill-green' : 'pill-amber'}`}>
                {c.status_label || c.workflow_status || 'In progress'}
              </span>
            </article>
          ))}
        </div>
      </main>

      {profileOpen ? (
        <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && setProfileOpen(false)}>
          <div className="modal-panel">
            <h2>Edit profile</h2>
            <form onSubmit={saveProfile}>
              <div className="form-group">
                <label>Name</label>
                <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}>
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {saveStatus ? <p className={`profile-save-status${saveStatus.includes('saved') ? ' ok' : saveStatus === 'Saving…' ? '' : ' err'}`}>{saveStatus}</p> : null}
              <button type="submit" className="btn-submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
              <button type="button" className="btn-ghost" onClick={() => setProfileOpen(false)}>Cancel</button>
            </form>
          </div>
        </div>
      ) : null}

      {cameraOpen ? (
        <div className="modal-bg open">
          <div className="modal-panel" style={{ maxWidth: 520, textAlign: 'center' }}>
            <h2>Point camera at the animal</h2>
            <div className="cam-box cam-ready">
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 16 }} />
            </div>
            <canvas ref={captureRef} style={{ display: 'none' }} />
            <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" className="btn-submit" onClick={captureAndReport}>Capture &amp; report</button>
              <button type="button" className="btn-ghost" onClick={closeCamera}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {reportOpen ? (
        <div className="modal-bg open">
          <div className="modal-panel">
            <h2><i className="fas fa-check-circle" style={{ color: '#22c55e', marginRight: 10 }} />Ready to dispatch</h2>
            <p className="sub-text">Animal: <strong>{detectedAnimal || 'Animal'}</strong></p>
            <div className="form-group">
              <label>What happened?</label>
              <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Injured, stuck, bleeding…" />
            </div>
            <button type="button" className="btn-submit" onClick={submitReport} disabled={reportSubmitting}>
              {reportSubmitting ? 'Submitting…' : 'Submit & dispatch help'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setReportOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
