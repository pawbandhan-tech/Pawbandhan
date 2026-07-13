'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/SiteLogo';

function FileUploadField({ label, value, onChange, required }) {
  const [preview, setPreview] = useState(value || '');
  const [uploading, setUploading] = useState(false);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target.result;
      setPreview(result);
      onChange(result);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="pb-label">{label}{required && <span style={{ color: 'var(--color-pb-danger)' }}> *</span>}</label>
      <input type="file" accept="image/*,.pdf" onChange={handleFile} style={{ fontSize: '0.85rem', marginBottom: 6 }} />
      {uploading && <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}><i className="fas fa-spinner fa-spin"></i> Reading file...</div>}
      {preview && (
        <div style={{ marginTop: 6, padding: 6, borderRadius: 8, background: 'rgba(27,107,82,0.04)', border: '1px solid var(--color-pb-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {preview.startsWith('data:image') ? (
            <img src={preview} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
          ) : (
            <i className="fas fa-file-pdf" style={{ fontSize: '1.2rem', color: 'var(--color-pb-danger)' }}></i>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-pb-primary)' }}>Document uploaded</div>
            <button type="button" onClick={() => { setPreview(''); onChange(''); }} style={{ fontSize: '0.75rem', color: 'var(--color-pb-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DoctorDashboardClient() {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [profile, setProfile] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showKyc, setShowKyc] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', gender: '' });
  const [kycForm, setKycForm] = useState({ specialization: '', licenseNumber: '', hospitalName: '' });
  const [kycDocs, setKycDocs] = useState({
    pan: '', aadhaar: '', photograph: '',
    vciRegistration: '', ivprEntry: '', bvscDegree: '',
    gstin: '', clinicAddressProof: '',
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('doctor_uid');
    if (!stored) { router.push('/auth/doctor'); return; }
    setUid(stored);
    loadAll(stored);
  }, [router]);

  async function loadAll(u) {
    setLoading(true);
    try {
      const [pRes, dRes, cRes] = await Promise.all([
        fetch(`/api/users/${u}/profile`).catch(() => null),
        fetch(`/api/doctors/${u}`).catch(() => null),
        fetch(`/api/users/${u}/cases-track`).catch(() => null),
      ]);
      if (pRes?.ok) setProfile(await pRes.json());
      if (dRes?.ok) setDoctor(await dRes.json());
      if (cRes?.ok) { const d = await cRes.json(); setCases(Array.isArray(d) ? d : d.cases || []); }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    if (profile) setProfileForm({ name: profile.name || '', phone: profile.phone || '', gender: profile.gender || '' });
  }, [profile]);

  useEffect(() => {
    if (doctor) {
      setKycForm({ specialization: doctor.specialization || '', licenseNumber: doctor.licenseNumber || '', hospitalName: doctor.hospitalName || '' });
      if (doctor.kycData && typeof doctor.kycData === 'object') {
        const docs = doctor.kycData.documents || doctor.kycData;
        setKycDocs(prev => {
          const next = { ...prev };
          Object.keys(prev).forEach(k => {
            if (docs[k]) next[k] = docs[k];
          });
          return next;
        });
      }
    }
  }, [doctor]);

  async function handleSaveProfile() {
    if (!uid) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${uid}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setProfile(prev => ({ ...prev, ...profileForm }));
      showToast('Profile updated');
      setShowProfile(false);
    } catch (err) { showToast(err.message, 'error'); }
    setSavingProfile(false);
  }

  async function handleKycSubmit() {
    if (!uid) return;
    setSubmittingKyc(true);
    try {
      const storeUid = sessionStorage.getItem('doctor_uid');
      const res = await fetch(`/api/doctors/${storeUid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...kycForm,
          kycData: {
            ...kycForm,
            documents: { ...kycDocs },
            submittedAt: new Date().toISOString(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'KYC submission failed');
      setDoctor(prev => ({ ...prev, ...kycForm, kycData: { ...kycForm, documents: { ...kycDocs }, submittedAt: new Date().toISOString() }, status: 'kyc_submitted' }));
      showToast('KYC documents submitted successfully!');
      setShowKyc(false);
    } catch (err) { showToast(err.message, 'error'); }
    setSubmittingKyc(false);
  }

  function logout() { sessionStorage.removeItem('doctor_uid'); router.push('/auth/doctor'); }

  const kycStatus = doctor?.status === 'active' ? 'verified' : (doctor?.status === 'rejected' ? 'rejected' : 'pending');
  const profileComplete = profile?.name && profile?.phone && profile?.email;
  const docsSubmitted = doctor?.kycData && Object.keys(doctor.kycData).length > 0;
  const steps = [
    { label: 'Account Created', done: true },
    { label: 'Profile Complete', done: !!profileComplete },
    { label: 'Documents Submitted', done: !!docsSubmitted },
    { label: 'Verified', done: kycStatus === 'verified' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--color-pb-doctor)' }}></i>
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
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Vet Dashboard</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-pb-text-muted)' }}>{profile?.name || 'Doctor'}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}><i className="fas fa-right-from-bracket"></i> Sign out</button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <div className="glass-lg" style={{ padding: 28, marginBottom: 24, background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(59,130,246,0.04))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-pb-doctor)', marginBottom: 8 }}>Veterinarian Portal</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>Welcome, {profile?.name || 'Doctor'}</h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', marginTop: 8 }}>View assigned cases and manage your practice.</p>
            </div>
            <span className={`badge ${kycStatus === 'verified' ? 'badge-green' : kycStatus === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
              <i className={`fas ${kycStatus === 'verified' ? 'fa-check-circle' : kycStatus === 'rejected' ? 'fa-times-circle' : 'fa-clock'}`}></i>
              {kycStatus === 'verified' ? 'Verified' : kycStatus === 'rejected' ? 'Rejected' : 'Pending Review'}
            </span>
          </div>
        </div>

        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>KYC Verification</h3>
            {kycStatus !== 'verified' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowKyc(true)}>
                <i className="fas fa-file-upload"></i> Submit KYC
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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

        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>Assigned Cases</h3>
          {cases.length === 0 ? (
            <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No cases assigned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cases.map((c, i) => (
                <div key={i} style={{ padding: '14px 16px', background: 'rgba(37,99,235,0.03)', borderRadius: 14, border: '1px solid var(--color-pb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37,99,235,0.1)', color: 'var(--color-pb-doctor)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-paw" style={{ fontSize: '0.85rem' }}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.animalType || 'Animal'} — {c.incidentCode || `Case #${c.id}`}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{c.status || 'open'}</div>
                    </div>
                  </div>
                  <span className="badge badge-blue">{c.workflowStatus || c.status || 'open'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>Profile</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowProfile(true)}>
              <i className="fas fa-pen"></i> Edit
            </button>
          </div>
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
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Specialization</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{doctor?.specialization || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Hospital</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{doctor?.hospitalName || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>PRN</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{doctor?.prn || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {showKyc && (
        <div className="modal-overlay" onClick={() => setShowKyc(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Submit KYC Documents</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowKyc(false)}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(37,99,235,0.06)', border: '1px solid var(--color-pb-border)', marginBottom: 16, fontSize: '0.82rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.5 }}>
                <i className="fas fa-info-circle" style={{ color: 'var(--color-pb-doctor)', marginRight: 6 }}></i>
                Upload all required Indian regulatory documents for veterinary practice. Documents will be reviewed within 2-3 business days.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div>
                  <label className="pb-label">PRN Number</label>
                  <input className="pb-input" value={doctor?.prn || ''} disabled style={{ opacity: 0.6 }} />
                </div>
                <div>
                  <label className="pb-label">Specialization</label>
                  <input className="pb-input" value={kycForm.specialization} onChange={e => setKycForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Surgery, Orthopedics, General" />
                </div>
                <div>
                  <label className="pb-label">License Number</label>
                  <input className="pb-input" value={kycForm.licenseNumber} onChange={e => setKycForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="Your veterinary license number" />
                </div>
                <div>
                  <label className="pb-label">Hospital Name</label>
                  <input className="pb-input" value={kycForm.hospitalName} onChange={e => setKycForm(f => ({ ...f, hospitalName: e.target.value }))} placeholder="Hospital or clinic name" />
                </div>

                <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(27,107,82,0.04)', border: '1px solid var(--color-pb-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--color-pb-primary)' }}>
                    <i className="fas fa-id-card" style={{ marginRight: 6 }}></i>Personal Identity (Required)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <FileUploadField label="PAN Card" value={kycDocs.pan} onChange={v => setKycDocs(f => ({ ...f, pan: v }))} required />
                    <FileUploadField label="Aadhaar Card" value={kycDocs.aadhaar} onChange={v => setKycDocs(f => ({ ...f, aadhaar: v }))} required />
                    <FileUploadField label="Passport-size Photograph" value={kycDocs.photograph} onChange={v => setKycDocs(f => ({ ...f, photograph: v }))} required />
                  </div>
                </div>

                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(37,99,235,0.04)', border: '1px solid var(--color-pb-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--color-pb-doctor)' }}>
                    <i className="fas fa-user-md" style={{ marginRight: 6 }}></i>Professional Documents (Required for Vets)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <FileUploadField label="VCI Registration Certificate" value={kycDocs.vciRegistration} onChange={v => setKycDocs(f => ({ ...f, vciRegistration: v }))} required />
                    <FileUploadField label="IVPR Entry Copy" value={kycDocs.ivprEntry} onChange={v => setKycDocs(f => ({ ...f, ivprEntry: v }))} required />
                    <FileUploadField label="BVSc Degree Certificate" value={kycDocs.bvscDegree} onChange={v => setKycDocs(f => ({ ...f, bvscDegree: v }))} required />
                  </div>
                </div>

                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(212,160,23,0.04)', border: '1px solid var(--color-pb-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--color-pb-accent)' }}>
                    <i className="fas fa-building" style={{ marginRight: 6 }}></i>Business Documents (Optional)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <FileUploadField label="GSTIN Certificate" value={kycDocs.gstin} onChange={v => setKycDocs(f => ({ ...f, gstin: v }))} />
                    <FileUploadField label="Clinic Address Proof" value={kycDocs.clinicAddressProof} onChange={v => setKycDocs(f => ({ ...f, clinicAddressProof: v }))} />
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleKycSubmit} disabled={submittingKyc}>
                  {submittingKyc ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : <><i className="fas fa-paper-plane"></i> Submit for Review</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowProfile(false)}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="pb-label">Name</label>
                  <input className="pb-input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="pb-label">Email</label>
                  <input className="pb-input" value={profile?.email || ''} disabled style={{ opacity: 0.6 }} />
                </div>
                <div>
                  <label className="pb-label">Phone</label>
                  <input className="pb-input" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="pb-label">Gender</label>
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
