'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SiteLogo from '@/components/SiteLogo';
import IdBadge from '@/components/IdBadge';
import LiveTracker from '@/components/LiveTracker';
import { ANIMAL_DATABASE } from '@/lib/animals';
import { CASE_WORKFLOW_STAGES, getWorkflowStage, getProgressPercent } from '@/lib/case-workflow';

const ANIMAL_ICONS = {
  dog: 'fa-dog', cat: 'fa-cat', cow: 'fa-cow', horse: 'fa-horse', bird: 'fa-dove',
  default: 'fa-paw',
};

function getAnimalIcon(type) {
  if (!type) return ANIMAL_ICONS.default;
  const t = type.toLowerCase();
  if (t.includes('dog') || t.includes('canine')) return ANIMAL_ICONS.dog;
  if (t.includes('cat') || t.includes('feline')) return ANIMAL_ICONS.cat;
  if (t.includes('cow') || t.includes('cattle') || t.includes('bovine')) return ANIMAL_ICONS.cow;
  if (t.includes('horse') || t.includes('equine')) return ANIMAL_ICONS.horse;
  if (t.includes('bird') || t.includes('avian')) return ANIMAL_ICONS.bird;
  return ANIMAL_ICONS.default;
}

const ANIMATED_STAGES = ['rider_picking', 'en_route_vet', 'rider_dropping'];

function CaseTrackingTimeline({ workflowStatus }) {
  const currentIdx = CASE_WORKFLOW_STAGES.findIndex(s => s.key === workflowStatus);
  const activeIdx = currentIdx >= 0 ? currentIdx : 0;
  const progress = getProgressPercent(workflowStatus || 'reported');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div className="workflow-progress-bar" style={{ flex: 1, height: 6 }}>
          <div className="workflow-progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-pb-primary)' }}>{progress}%</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {CASE_WORKFLOW_STAGES.map((stage, i) => {
          const isCompleted = i < activeIdx;
          const isCurrent = i === activeIdx;
          const isFuture = i > activeIdx;
          const isAnimated = stage.animate && isCurrent;

          let dotColor = 'var(--color-pb-border)';
          let textColor = 'var(--color-pb-text-muted)';
          let iconColor = 'var(--color-pb-text-muted)';

          if (isCompleted) {
            dotColor = stage.color;
            textColor = 'var(--color-pb-text)';
            iconColor = stage.color;
          } else if (isCurrent) {
            dotColor = stage.color;
            textColor = 'var(--color-pb-text)';
            iconColor = stage.color;
          }

          return (
            <div key={stage.key} style={{ display: 'flex', gap: 14, position: 'relative', minHeight: isFuture ? 40 : 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                <div style={{
                  width: isCurrent ? 28 : 20,
                  height: isCurrent ? 28 : 20,
                  borderRadius: '50%',
                  background: isCompleted || isCurrent ? dotColor : 'transparent',
                  border: isFuture ? `2px solid ${stage.color}30` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  animation: isAnimated ? 'pulse 2s ease-in-out infinite' : 'none',
                  boxShadow: isCurrent ? `0 0 0 4px ${dotColor}20` : 'none',
                  transition: 'all 0.3s ease',
                }}>
                  {isCompleted ? (
                    <i className="fas fa-check" style={{ fontSize: '0.55rem', color: '#fff' }}></i>
                  ) : isCurrent ? (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}></div>
                  ) : (
                    <i className={`fas ${stage.icon}`} style={{ fontSize: '0.45rem', color: iconColor }}></i>
                  )}
                </div>
                {i < CASE_WORKFLOW_STAGES.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 12, background: isCompleted ? dotColor : 'var(--color-pb-border)', margin: '2px 0', transition: 'background 0.3s' }}></div>
                )}
              </div>
              <div style={{ paddingBottom: 12, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                  <i className={`fas ${stage.icon}`} style={{ fontSize: '0.72rem', color: iconColor, animation: isAnimated ? 'pulse 1.5s infinite' : 'none' }}></i>
                  <span style={{ fontWeight: isCurrent ? 800 : 600, fontSize: '0.82rem', color: textColor }}>{stage.label}</span>
                  {isCurrent && (
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: `${dotColor}15`, color: dotColor, letterSpacing: '0.05em' }}>current</span>
                  )}
                  {stage.requiresPin && isCompleted && (
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-pb-accent)' }}><i className="fas fa-lock"></i></span>
                  )}
                </div>
                {isCurrent && stage.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-pb-text-muted)', lineHeight: 1.4 }}>{stage.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentSection({ caseItem, caseCode, totals, onPaid }) {
  const [payMethod, setPayMethod] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);
  const [paying, setPaying] = useState(false);
  const [communityMode, setCommunityMode] = useState(false);
  const [communityProgress, setCommunityProgress] = useState(0);

  const totalAmount = totals?.subtotal || 0;
  const commission = totals?.commission || 0;
  const grandTotal = totals?.grandTotal || 0;

  async function handlePay() {
    setPaying(true);
    try {
      const res = await fetch(`/api/cases/${caseCode}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: payMethod || 'upi' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setShowPayForm(false);
      onPaid();
    } catch (err) { console.error(err); }
    setPaying(false);
  }

  function handleCommunityList() {
    setCommunityMode(true);
    setCommunityProgress(0);
  }

  if (communityMode) {
    const goal = grandTotal;
    const raised = Math.round(goal * 0.3);
    return (
      <div style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)', marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <i className="fas fa-people-group" style={{ color: 'var(--color-pb-primary)' }}></i>
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Community Funding</span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
            <span style={{ color: 'var(--color-pb-text-muted)' }}>Raised</span>
            <span style={{ fontWeight: 700 }}>₹{raised.toLocaleString()} / ₹{goal.toLocaleString()}</span>
          </div>
          <div className="workflow-progress-bar" style={{ height: 8 }}>
            <div className="workflow-progress-fill" style={{ width: `${Math.round((raised / goal) * 100)}%` }}></div>
          </div>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-secondary)', textAlign: 'center', padding: '12px 0' }}>
          <i className="fas fa-share-nodes" style={{ marginRight: 6, color: 'var(--color-pb-primary)' }}></i>
          Share this case with friends and family to raise funds
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <i className="fas fa-indian-rupee-sign" style={{ color: 'var(--color-pb-accent)' }}></i>
        <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Payment</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--color-pb-text-secondary)' }}>Treatment Cost</span>
          <span style={{ fontWeight: 600 }}>₹{totalAmount.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--color-pb-text-secondary)' }}>Platform Commission (15%)</span>
          <span style={{ fontWeight: 600, color: 'var(--color-pb-accent)' }}>₹{commission.toLocaleString()}</span>
        </div>
        <div style={{ borderTop: '1px solid var(--color-pb-border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800 }}>Total Payable</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-pb-primary)' }}>₹{grandTotal.toLocaleString()}</span>
        </div>
      </div>

      {!showPayForm ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowPayForm(true)}>
            <i className="fas fa-credit-card"></i> Pay Now
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleCommunityList}>
            <i className="fas fa-people-group"></i> Community Pay
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPayMethod('upi')} style={{ flex: 1, padding: '10px', borderRadius: 10, border: payMethod === 'upi' ? '2px solid var(--color-pb-primary)' : '1px solid var(--color-pb-border)', background: payMethod === 'upi' ? 'rgba(27,107,82,0.06)' : 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'var(--font-sans)', color: 'var(--color-pb-text)' }}>
              <i className="fas fa-mobile-screen" style={{ marginRight: 4 }}></i> UPI
            </button>
            <button onClick={() => setPayMethod('card')} style={{ flex: 1, padding: '10px', borderRadius: 10, border: payMethod === 'card' ? '2px solid var(--color-pb-primary)' : '1px solid var(--color-pb-border)', background: payMethod === 'card' ? 'rgba(27,107,82,0.06)' : 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'var(--font-sans)', color: 'var(--color-pb-text)' }}>
              <i className="fas fa-credit-card" style={{ marginRight: 4 }}></i> Card
            </button>
          </div>
          {payMethod === 'upi' && (
            <div>
              <label className="pb-label">UPI ID</label>
              <input className="pb-input" placeholder="yourname@upi" />
            </div>
          )}
          {payMethod === 'card' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label className="pb-label">Card Number</label><input className="pb-input" placeholder="XXXX XXXX XXXX XXXX" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label className="pb-label">Expiry</label><input className="pb-input" placeholder="MM/YY" /></div>
                <div style={{ flex: 1 }}><label className="pb-label">CVV</label><input className="pb-input" type="password" placeholder="***" /></div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPayForm(false)} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handlePay} disabled={paying || !payMethod} style={{ flex: 1 }}>
              {paying ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : <>Pay ₹{grandTotal.toLocaleString()}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', gender: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [trackingCase, setTrackingCase] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [caseTotals, setCaseTotals] = useState(null);

  const [newCaseCode, setNewCaseCode] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('customer_uid') || sessionStorage.getItem('portal_customer_uid');
    if (!stored) { router.push('/auth/customer'); return; }
    setUid(stored);
    loadDashboard(stored);
  }, [router]);

  useEffect(() => {
    if (!showReport) return;
    setLiveLocation({ status: 'detecting', lat: '', lng: '', address: '' });
    if (!navigator.geolocation) { setLiveLocation(prev => ({ ...prev, status: 'unavailable' })); return; }
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

  useEffect(() => { if (profile) setProfileForm({ name: profile.name || '', phone: profile.phone || '', gender: profile.gender || '' }); }, [profile]);

  async function handleSaveProfile() {
    if (!uid) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${uid}/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setProfile(prev => ({ ...prev, ...profileForm }));
      showToast('Profile updated');
      setShowProfile(false);
    } catch (err) { showToast(err.message, 'error'); }
    setSavingProfile(false);
  }

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
      if (data.incidentCode) {
        setNewCaseCode(data.incidentCode);
        setTimeout(() => openTracking({ incidentCode: data.incidentCode, animalType: reportForm.animalType }), 500);
      }
    } catch (err) { showToast(err.message, 'error'); }
    setReporting(false);
  }

  async function openTracking(caseItem) {
    const code = caseItem.incidentCode;
    if (!code) return;
    setTrackingCase(caseItem);
    setShowTracking(true);
    setTrackingLoading(true);
    setTrackingData(null);
    setCaseTotals(null);
    try {
      const [trackRes, expRes] = await Promise.all([
        fetch(`/api/incidents/${code}/tracking`).catch(() => null),
        fetch(`/api/cases/${code}/expenses`).catch(() => null),
      ]);
      if (trackRes?.ok) { const data = await trackRes.json(); setTrackingData(data); }
      if (expRes?.ok) { const data = await expRes.json(); setCaseTotals(data.totals || null); }
    } catch (e) { console.error(e); }
    setTrackingLoading(false);
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

  const trackingStatus = trackingData?.currentStatus || trackingCase?.workflowStatus || 'reported';
  const isAnimating = ANIMATED_STAGES.includes(trackingStatus);
  const isPaymentPending = trackingStatus === 'payment_pending';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-pb-bg)' }}>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}><i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>{toast.msg}</div>
        </div>
      )}

      <header style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-pb-border)', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SiteLogo size={36} />
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
          <button className="btn btn-ghost btn-icon" onClick={() => setShowProfile(true)}><i className="fas fa-user-circle"></i></button>
          <button className="btn btn-ghost btn-sm" onClick={logout}><i className="fas fa-right-from-bracket"></i></button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 28 }}>
          <button className="glass" style={{ padding: '20px 16px', textAlign: 'left', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }} onClick={() => setShowReport(true)}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(27,107,82,0.1)', color: 'var(--color-pb-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <i className="fas fa-paw"></i>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Report Rescue</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>Report an emergency</div>
          </button>
          <button className="glass" style={{ padding: '20px 16px', textAlign: 'left', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }} onClick={() => { const firstCase = cases[0]; if (firstCase) openTracking(firstCase); }}>
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

        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>My Cases</h3>
          {cases.length === 0 ? (
            <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No cases yet. Tap "Report Rescue" to get started.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cases.map((c, i) => {
                const stage = getWorkflowStage(c.workflowStatus || c.status || 'reported');
                const progress = getProgressPercent(c.workflowStatus || c.status || 'reported');
                const isCAnim = ANIMATED_STAGES.includes(c.workflowStatus || c.status);
                return (
                  <div key={i} onClick={() => openTracking(c)} style={{ cursor: 'pointer', padding: '16px 18px', background: 'rgba(27,107,82,0.03)', borderRadius: 14, border: '1px solid var(--color-pb-border)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-pb-primary)'; e.currentTarget.style.background = 'rgba(27,107,82,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-pb-border)'; e.currentTarget.style.background = 'rgba(27,107,82,0.03)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${stage.color}12`, color: stage.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`fas ${getAnimalIcon(c.animalType)}`} style={{ fontSize: '1rem', animation: isCAnim ? 'pulse 2s infinite' : 'none' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{c.animalType || 'Animal'}</span>
                          <IdBadge id={c.incidentCode || `PB-CASE-${c.id}`} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ padding: '3px 10px', borderRadius: 12, background: `${stage.color}12`, color: stage.color, fontWeight: 700, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <i className={`fas ${stage.icon}`} style={{ animation: isCAnim ? 'pulse 1.5s infinite' : 'none' }}></i> {stage.label}
                          </div>
                        </div>
                        <div className="workflow-progress-bar" style={{ width: '100%', maxWidth: 200 }}>
                          <div className="workflow-progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-pb-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Track <i className="fas fa-chevron-right" style={{ fontSize: '0.7rem' }}></i>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showTracking && (
        <div className="modal-overlay" onClick={() => { setShowTracking(false); setTrackingCase(null); setTrackingData(null); setCaseTotals(null); }}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Track Case</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowTracking(false); setTrackingCase(null); setTrackingData(null); setCaseTotals(null); }}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              {trackingLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--color-pb-primary)' }}></i>
                  <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--color-pb-text-muted)' }}>Loading tracking...</div>
                </div>
              ) : trackingData ? (
                <div>
                  <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(27,107,82,0.04)', border: '1px solid var(--color-pb-border)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${getWorkflowStage(trackingStatus).color}12`, color: getWorkflowStage(trackingStatus).color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={`fas ${getAnimalIcon(trackingData.case?.animalType)}`}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{trackingData.case?.animalType || 'Animal'}</div>
                        <IdBadge id={trackingData.case?.incidentCode} />
                      </div>
                      <div style={{ padding: '4px 10px', borderRadius: 12, background: `${getWorkflowStage(trackingStatus).color}12`, color: getWorkflowStage(trackingStatus).color, fontWeight: 700, fontSize: '0.75rem' }}>
                        <i className={`fas ${getWorkflowStage(trackingStatus).icon}`} style={{ marginRight: 3, animation: isAnimating ? 'pulse 1.5s infinite' : 'none' }}></i>
                        {getWorkflowStage(trackingStatus).label}
                      </div>
                    </div>
                    {trackingData.case?.ngo && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>Assigned to {trackingData.case.ngo.name}</div>
                    )}
                  </div>

                  {isAnimating && (
                    <LiveTracker caseCode={trackingData.case?.incidentCode || trackingCase?.incidentCode} />
                  )}

                  <CaseTrackingTimeline workflowStatus={trackingStatus} />

                  {isPaymentPending && caseTotals && (
                    <PaymentSection
                      caseItem={trackingData.case}
                      caseCode={trackingData.case?.incidentCode || trackingCase?.incidentCode}
                      totals={caseTotals}
                      onPaid={() => { showToast('Payment successful!'); openTracking(trackingCase); }}
                    />
                  )}

                  {trackingData.location && (
                    <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(37,99,235,0.04)', border: '1px solid var(--color-pb-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <i className="fas fa-location-dot" style={{ color: 'var(--color-pb-doctor)', fontSize: '0.85rem' }}></i>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Location</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>
                        Lat: {trackingData.location.lat}, Lng: {trackingData.location.lng}
                      </div>
                      {trackingData.location.lat && trackingData.location.lng && (
                        <a href={`https://www.google.com/maps?q=${trackingData.location.lat},${trackingData.location.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--color-pb-primary)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <i className="fas fa-external-link-alt" style={{ fontSize: '0.7rem' }}></i> View on Maps
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>
                  No tracking data available for this case.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="modal-overlay" onClick={() => setShowReport(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Report Animal Rescue</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowReport(false)}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: liveLocation.status === 'ready' ? 'rgba(27,107,82,0.06)' : liveLocation.status === 'denied' ? 'rgba(220,38,38,0.06)' : 'rgba(212,160,23,0.06)', border: '1px solid var(--color-pb-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <i className={`fas ${liveLocation.status === 'detecting' ? 'fa-spinner fa-spin' : liveLocation.status === 'ready' ? 'fa-location-dot' : 'fa-triangle-exclamation'}`} style={{ color: liveLocation.status === 'ready' ? 'var(--color-pb-primary)' : liveLocation.status === 'denied' ? 'var(--color-pb-danger)' : 'var(--color-pb-accent)', fontSize: '0.85rem' }}></i>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {liveLocation.status === 'detecting' && 'Detecting your location...'}
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
                    <option value="">Select animal...</option>
                    {ANIMAL_DATABASE.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="pb-label">Description</label>
                  <textarea className="pb-textarea" value={reportForm.description} onChange={e => setReportForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the animal's condition..." required />
                </div>
                <div>
                  <label className="pb-label">Landmark (optional)</label>
                  <input className="pb-input" value={reportForm.location} onChange={e => setReportForm(f => ({ ...f, location: e.target.value }))} placeholder="Nearby landmark or address" />
                </div>
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
                  {reporting ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : <><i className="fas fa-paper-plane"></i> Submit Report</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

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

      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>My Profile</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowProfile(false)}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label className="pb-label">Name</label><input className="pb-input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="pb-label">Email</label><input className="pb-input" value={profile?.email || ''} disabled /></div>
                <div><label className="pb-label">Phone</label><input className="pb-input" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="pb-label">Gender</label>
                  <select className="pb-select" value={profileForm.gender} onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> Save Profile</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
