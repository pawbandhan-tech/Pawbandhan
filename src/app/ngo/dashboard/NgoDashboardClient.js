'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NgoDashboardClient() {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [ngo, setNgo] = useState(null);
  const [cases, setCases] = useState([]);
  const [riders, setRiders] = useState([]);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showKyc, setShowKyc] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [kycForm, setKycForm] = useState({
    ngoType: '', regNumber: '', panNumber: '', address: '', city: '', state: '', serviceArea: '', workType: '',
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('ngo_uid');
    if (!stored) { router.push('/auth/ngo'); return; }
    setUid(stored);
    loadAll(stored);
  }, [router]);

  async function loadAll(u) {
    setLoading(true);
    try {
      const [ngoRes, casesRes] = await Promise.all([
        fetch(`/api/ngos/${u}`).catch(() => null),
        fetch(`/api/ngos/${u}/cases`).catch(() => null),
      ]);
      if (ngoRes?.ok) setNgo(await ngoRes.json());
      if (casesRes?.ok) { const d = await casesRes.json(); setCases(Array.isArray(d) ? d : d.cases || []); }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    if (ngo) {
      setKycForm({
        ngoType: ngo.ngoType || '',
        regNumber: ngo.regNumber || '',
        panNumber: ngo.panNumber || '',
        address: ngo.address || '',
        city: ngo.city || '',
        state: ngo.state || '',
        serviceArea: ngo.serviceArea || '',
        workType: ngo.workType || '',
      });
    }
  }, [ngo]);

  async function handleKycSubmit() {
    if (!uid) return;
    setSubmittingKyc(true);
    try {
      const res = await fetch(`/api/ngos/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...kycForm, kycData: { ...kycForm, submittedAt: new Date().toISOString() } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'KYC submission failed');
      setNgo(prev => ({ ...prev, ...kycForm, kycData: { ...kycForm, submittedAt: new Date().toISOString() } }));
      showToast('KYC documents submitted successfully!');
      setShowKyc(false);
    } catch (err) { showToast(err.message, 'error'); }
    setSubmittingKyc(false);
  }

  function logout() { sessionStorage.removeItem('ngo_uid'); router.push('/auth/ngo'); }

  const kycStatus = ngo?.status === 'active' ? 'verified' : (ngo?.status === 'rejected' ? 'rejected' : 'pending');
  const profileComplete = ngo?.name && ngo?.email && ngo?.phone;
  const docsSubmitted = ngo?.kycData && Object.keys(ngo.kycData).length > 0;
  const steps = [
    { label: 'Account Created', done: true },
    { label: 'Profile Complete', done: !!profileComplete },
    { label: 'KYC Documents Submitted', done: !!docsSubmitted },
    { label: 'Verified', done: kycStatus === 'verified' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--color-pb-ngo)' }}></i>
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
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-pb-ngo), #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <i className="fas fa-building"></i>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>NGO Dashboard</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-pb-text-muted)' }}>{ngo?.name || 'Partner'}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}><i className="fas fa-right-from-bracket"></i> Sign out</button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* Hero Card */}
        <div className="glass-lg" style={{ padding: 28, marginBottom: 24, background: 'linear-gradient(135deg, rgba(8,145,178,0.08), rgba(6,182,212,0.04))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-pb-ngo)', marginBottom: 8 }}>NGO Partner</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>Welcome, {ngo?.name || 'Partner'}</h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', marginTop: 8 }}>Manage cases, track rescues, and coordinate your team.</p>
            </div>
            <span className={`badge ${kycStatus === 'verified' ? 'badge-green' : kycStatus === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
              <i className={`fas ${kycStatus === 'verified' ? 'fa-check-circle' : kycStatus === 'rejected' ? 'fa-times-circle' : 'fa-clock'}`}></i>
              {kycStatus === 'verified' ? 'Verified' : kycStatus === 'rejected' ? 'Rejected' : 'Pending Review'}
            </span>
          </div>
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

        {/* Team Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div className="glass" style={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.8rem', color: 'var(--color-pb-ngo)' }}>{cases.length}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-pb-text-muted)' }}>Total Cases</div>
          </div>
          <div className="glass" style={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.8rem', color: 'var(--color-pb-ngo)' }}>{reps.length || 0}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-pb-text-muted)' }}>Field Rescuers</div>
          </div>
          <div className="glass" style={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.8rem', color: 'var(--color-pb-ngo)' }}>{riders.length || 0}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-pb-text-muted)' }}>Riders</div>
          </div>
        </div>

        {/* Cases */}
        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>Cases</h3>
          {cases.length === 0 ? (
            <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No cases assigned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cases.map((c, i) => (
                <div key={i} style={{ padding: '14px 16px', background: 'rgba(8,145,178,0.03)', borderRadius: 14, border: '1px solid var(--color-pb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(8,145,178,0.1)', color: 'var(--color-pb-ngo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-paw" style={{ fontSize: '0.85rem' }}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.animalType || 'Animal'} — {c.incidentCode || c.customerName || `Case #${c.id}`}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{c.condition || c.status || 'open'}</div>
                    </div>
                  </div>
                  <span className="badge badge-teal">{c.workflowStatus || c.status || 'open'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Summary */}
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>Organization Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Organization</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{ngo?.name || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Email</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{ngo?.email || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Phone</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{ngo?.phone || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>NGO Type</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{ngo?.ngoType || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>City / State</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{[ngo?.city, ngo?.state].filter(Boolean).join(', ') || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>PRN</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{ngo?.prn || '—'}</div>
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
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(8,145,178,0.06)', border: '1px solid var(--color-pb-border)', marginBottom: 16, fontSize: '0.82rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.5 }}>
                <i className="fas fa-info-circle" style={{ color: 'var(--color-pb-ngo)', marginRight: 6 }}></i>
                Please fill in your organization details and upload registration documents, PAN card, and proof of address. Verification takes 2-3 business days.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="pb-label">NGO Type</label>
                  <select className="pb-select" value={kycForm.ngoType} onChange={e => setKycForm(f => ({ ...f, ngoType: e.target.value }))}>
                    <option value="">Select type…</option>
                    <option value="shelter">Animal Shelter</option>
                    <option value="rescue">Rescue Organization</option>
                    <option value="welfare">Animal Welfare</option>
                    <option value="sterilization">Sterilization & Vaccination</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="pb-label">Registration Number</label>
                  <input className="pb-input" value={kycForm.regNumber} onChange={e => setKycForm(f => ({ ...f, regNumber: e.target.value }))} placeholder="NGO registration number" />
                </div>
                <div>
                  <label className="pb-label">PAN Number</label>
                  <input className="pb-input" value={kycForm.panNumber} onChange={e => setKycForm(f => ({ ...f, panNumber: e.target.value }))} placeholder="Organization PAN" />
                </div>
                <div>
                  <label className="pb-label">Address</label>
                  <textarea className="pb-textarea" value={kycForm.address} onChange={e => setKycForm(f => ({ ...f, address: e.target.value }))} placeholder="Full registered address" style={{ minHeight: 60 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="pb-label">City</label>
                    <input className="pb-input" value={kycForm.city} onChange={e => setKycForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="pb-label">State</label>
                    <input className="pb-input" value={kycForm.state} onChange={e => setKycForm(f => ({ ...f, state: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="pb-label">Service Area</label>
                  <input className="pb-input" value={kycForm.serviceArea} onChange={e => setKycForm(f => ({ ...f, serviceArea: e.target.value }))} placeholder="Areas you serve" />
                </div>
                <div>
                  <label className="pb-label">Work Type</label>
                  <input className="pb-input" value={kycForm.workType} onChange={e => setKycForm(f => ({ ...f, workType: e.target.value }))} placeholder="e.g. Rescue, Sterilization, Adoption" />
                </div>
                <button className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, var(--color-pb-ngo), #06b6d4)' }} onClick={handleKycSubmit} disabled={submittingKyc}>
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
