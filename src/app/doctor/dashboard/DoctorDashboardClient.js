'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/SiteLogo';
import SupportWidget from '@/components/SupportWidget';
import { CASE_WORKFLOW_STAGES, getWorkflowStage, getProgressPercent } from '@/lib/case-workflow';

const ANIMAL_ICONS = { dog: 'fa-dog', cat: 'fa-cat', cow: 'fa-cow', horse: 'fa-horse', bird: 'fa-dove', default: 'fa-paw' };

function getAnimalIcon(type) {
  if (!type) return ANIMAL_ICONS.default;
  const t = type.toLowerCase();
  if (t.includes('dog') || t.includes('canine')) return ANIMAL_ICONS.dog;
  if (t.includes('cat') || t.includes('feline')) return ANIMAL_ICONS.cat;
  if (t.includes('cow') || t.includes('cattle')) return ANIMAL_ICONS.cow;
  if (t.includes('horse') || t.includes('equine')) return ANIMAL_ICONS.horse;
  if (t.includes('bird') || t.includes('avian')) return ANIMAL_ICONS.bird;
  return ANIMAL_ICONS.default;
}

function FileUploadField({ label, value, onChange, required }) {
  const [preview, setPreview] = useState(value || '');
  const [uploading, setUploading] = useState(false);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => { setPreview(ev.target.result); onChange(ev.target.result); setUploading(false); };
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

function PhotoSection({ title, icon, photos, caseCode, photoType, uid, showToast, onPhotoAdded }) {
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef(null);
  const fileRef = useRef(null);

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/cases/${caseCode}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoType, fileUrl: base64, uploadedBy: 'doctor', uploaderId: uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      showToast(`${title} photo uploaded`);
      setShowModal(false);
      onPhotoAdded();
    } catch (err) { showToast(err.message, 'error'); }
    setUploading(false);
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`fas ${icon}`} style={{ fontSize: '0.85rem', color: 'var(--color-pb-primary)' }}></i>
          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{title}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-pb-text-muted)', background: 'rgba(27,107,82,0.06)', padding: '2px 8px', borderRadius: 10 }}>{photos.length}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)} style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
          <i className="fas fa-camera"></i> Add
        </button>
      </div>
      {photos.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {photos.map((photo) => (
            <div key={photo.id} style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-pb-border)', position: 'relative' }}>
              {photo.fileUrl && photo.fileUrl.startsWith('data:image') ? (
                <img src={photo.fileUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(27,107,82,0.06)' }}>
                  <i className="fas fa-file-medical" style={{ fontSize: '1.2rem', color: 'var(--color-pb-text-muted)' }}></i>
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.55rem', padding: '2px 4px', textAlign: 'center' }}>
                {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString() : ''}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-pb-text-muted)', fontSize: '0.82rem', borderRadius: 10, border: '1px dashed var(--color-pb-border)' }}>
          No photos yet
        </div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowModal(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Add {title}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)} disabled={uploading}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files[0]; if (f) handleUpload(f); }} />
                <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files[0]; if (f) handleUpload(f); }} />
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => cameraRef.current?.click()} disabled={uploading}>
                  <i className="fas fa-camera"></i> Take Photo
                </button>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <i className="fas fa-upload"></i> Upload File
                </button>
                {uploading && <div style={{ textAlign: 'center', padding: 12 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 20, color: 'var(--color-pb-primary)' }}></i><div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginTop: 8 }}>Uploading...</div></div>}
              </div>
            </div>
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
  const [kycDocs, setKycDocs] = useState({ pan: '', aadhaar: '', photograph: '', vciRegistration: '', ivprEntry: '', bvscDegree: '', gstin: '', clinicAddressProof: '' });

  const [viewingCaseDetail, setViewingCaseDetail] = useState(null);
  const [caseDetailTab, setCaseDetailTab] = useState('treatment');
  const [caseReport, setCaseReport] = useState(null);
  const [casePhotos, setCasePhotos] = useState({});
  const [caseTimeline, setCaseTimeline] = useState([]);
  const [caseExpenses, setCaseExpenses] = useState({ expenses: [], totals: { subtotal: 0, commissionPct: 15, commission: 0, grandTotal: 0 } });
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [reportForm, setReportForm] = useState({ diagnosis: '', treatment: '', medications: '', notes: '', followUpDate: '', estimatedCost: '' });
  const [savingReport, setSavingReport] = useState(false);

  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'medicine' });
  const [addingExpense, setAddingExpense] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('doctor_uid');
    if (!stored) { router.push('/auth/doctor'); return; }
    setUid(stored);
    loadAll(stored);
  }, [router]);

  useEffect(() => {
    const ssoToken = sessionStorage.getItem('pb_portal_token');
    if (ssoToken && !sessionStorage.getItem('doctor_uid')) {
      fetch('/api/doctors/me', { headers: { Authorization: `Bearer ${ssoToken}` } })
        .then(r => r.json())
        .then(d => { if (d.uid) { sessionStorage.setItem('doctor_uid', d.uid); setUid(d.uid); loadAll(d.uid); } })
        .catch(() => {});
    }
  }, []);

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

  useEffect(() => { if (profile) setProfileForm({ name: profile.name || '', phone: profile.phone || '', gender: profile.gender || '' }); }, [profile]);

  useEffect(() => {
    if (doctor) {
      setKycForm({ specialization: doctor.specialization || '', licenseNumber: doctor.licenseNumber || '', hospitalName: doctor.hospitalName || '' });
      if (doctor.kycData && typeof doctor.kycData === 'object') {
        const docs = doctor.kycData.documents || doctor.kycData;
        setKycDocs(prev => { const next = { ...prev }; Object.keys(prev).forEach(k => { if (docs[k]) next[k] = docs[k]; }); return next; });
      }
    }
  }, [doctor]);

  async function openCaseDetail(c) {
    setViewingCaseDetail(c);
    setCaseDetailTab('treatment');
    setLoadingDetail(true);
    try {
      const code = c.incidentCode;
      const [reportRes, photosRes, timelineRes, expensesRes] = await Promise.all([
        fetch(`/api/cases/${code}/report`).catch(() => null),
        fetch(`/api/cases/${code}/photos`).catch(() => null),
        fetch(`/api/incidents/${code}/tracking`).catch(() => null),
        fetch(`/api/cases/${code}/expenses`).catch(() => null),
      ]);
      if (reportRes?.ok) {
        const rd = await reportRes.json();
        setCaseReport(rd.report);
        if (rd.report) {
          setReportForm({
            diagnosis: rd.report.diagnosis || '',
            treatment: rd.report.treatment || '',
            medications: rd.report.medications || '',
            notes: rd.report.notes || '',
            followUpDate: rd.report.followUpDate || '',
            estimatedCost: rd.report.followUpDate ? '' : (rd.estimatedCost || ''),
          });
        }
        if (rd.estimatedCost) setReportForm(f => ({ ...f, estimatedCost: String(rd.estimatedCost) }));
      }
      if (photosRes?.ok) { const pd = await photosRes.json(); setCasePhotos(pd.grouped || {}); }
      if (timelineRes?.ok) { const td = await timelineRes.json(); setCaseTimeline(td.timeline || []); }
      if (expensesRes?.ok) { const ed = await expensesRes.json(); setCaseExpenses(ed); }
    } catch (e) { console.error(e); }
    setLoadingDetail(false);
  }

  async function refreshCaseDetail() {
    if (!viewingCaseDetail) return;
    const code = viewingCaseDetail.incidentCode;
    try {
      const [reportRes, photosRes, expensesRes] = await Promise.all([
        fetch(`/api/cases/${code}/report`).catch(() => null),
        fetch(`/api/cases/${code}/photos`).catch(() => null),
        fetch(`/api/cases/${code}/expenses`).catch(() => null),
      ]);
      if (reportRes?.ok) {
        const rd = await reportRes.json();
        setCaseReport(rd.report);
        if (rd.report) {
          setReportForm({
            diagnosis: rd.report.diagnosis || '',
            treatment: rd.report.treatment || '',
            medications: rd.report.medications || '',
            notes: rd.report.notes || '',
            followUpDate: rd.report.followUpDate || '',
            estimatedCost: '',
          });
        }
        if (rd.estimatedCost) setReportForm(f => ({ ...f, estimatedCost: String(rd.estimatedCost) }));
      }
      if (photosRes?.ok) { const pd = await photosRes.json(); setCasePhotos(pd.grouped || {}); }
      if (expensesRes?.ok) { setCaseExpenses(await expensesRes.json()); }
    } catch (e) { console.error(e); }
  }

  async function saveReport() {
    if (!viewingCaseDetail) return;
    setSavingReport(true);
    try {
      const res = await fetch(`/api/cases/${viewingCaseDetail.incidentCode}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      showToast('Treatment report saved');
      refreshCaseDetail();
    } catch (err) { showToast(err.message, 'error'); }
    setSavingReport(false);
  }

  async function addExpense() {
    if (!viewingCaseDetail || !expenseForm.description || !expenseForm.amount) return;
    setAddingExpense(true);
    try {
      const res = await fetch(`/api/cases/${viewingCaseDetail.incidentCode}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expenseForm, addedBy: 'doctor' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Expense added');
      setExpenseForm({ description: '', amount: '', category: 'medicine' });
      setCaseExpenses(data);
    } catch (err) { showToast(err.message, 'error'); }
    setAddingExpense(false);
  }

  async function downloadPrescription(c) {
    try {
      const { generatePrescriptionPDF } = await import('@/lib/pdf-generator');
      const doc = generatePrescriptionPDF({
        caseCode: c.incidentCode,
        animalType: c.animalType,
        patientInfo: `${c.animalType} - ${c.description || ''}`,
        diagnosis: reportForm.diagnosis,
        treatment: reportForm.treatment,
        medications: reportForm.medications,
        notes: reportForm.notes,
        doctorName: profile?.name || doctor?.name || 'Doctor',
        doctorLicense: doctor?.licenseNumber || '',
        hospitalName: doctor?.hospitalName || '',
        timestamp: new Date().toISOString(),
        ip: 'N/A',
      });
      doc.save(`Prescription_${c.incidentCode}.pdf`);
      showToast('Prescription PDF downloaded');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF', 'error');
    }
  }

  async function handleSaveProfile() {
    if (!uid) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${uid}/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileForm),
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
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...kycForm, kycData: { ...kycForm, documents: { ...kycDocs }, submittedAt: new Date().toISOString() } }),
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

  const detailCase = viewingCaseDetail;
  const detailStage = detailCase ? getWorkflowStage(detailCase.workflowStatus || detailCase.status || 'reported') : null;
  const detailProgress = detailCase ? getProgressPercent(detailCase.workflowStatus || detailCase.status || 'reported') : 0;

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

      {detailCase ? (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }} className="case-detail-panel">
          <button onClick={() => { setViewingCaseDetail(null); setCaseReport(null); setCasePhotos({}); setCaseTimeline([]); }} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
            <i className="fas fa-arrow-left"></i> Back to Cases
          </button>

          <div style={{ padding: '20px 24px', borderRadius: 18, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${detailStage.color}15`, color: detailStage.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fas ${getAnimalIcon(detailCase.animalType)}`} style={{ fontSize: '1.1rem' }}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-display)' }}>{detailCase.animalType || 'Animal'}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', background: 'rgba(27,107,82,0.06)', padding: '3px 10px', borderRadius: 8, fontFamily: 'monospace' }}>
                    ...{(detailCase.incidentCode || '').slice(-4)}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginTop: 2 }}>{detailCase.description || ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ padding: '4px 12px', borderRadius: 20, background: `${detailStage.color}15`, color: detailStage.color, fontWeight: 700, fontSize: '0.78rem' }}>
                  <i className={`fas ${detailStage.icon}`} style={{ marginRight: 4 }}></i>
                  {detailStage.label}
                </div>
              </div>
            </div>
            <div className="workflow-progress-bar" style={{ marginTop: 14 }}>
              <div className="workflow-progress-fill" style={{ width: `${detailProgress}%` }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--color-pb-surface)', borderRadius: 14, padding: 4, border: '1px solid var(--color-pb-border)' }}>
            {[
              { key: 'treatment', icon: 'fa-stethoscope', label: 'Treatment' },
              { key: 'photos', icon: 'fa-camera', label: 'Photos' },
              { key: 'timeline', icon: 'fa-clock-rotate-left', label: 'Timeline' },
              { key: 'expenses', icon: 'fa-indian-rupee-sign', label: 'Expenses' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setCaseDetailTab(tab.key)}
                style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
                  background: caseDetailTab === tab.key ? 'rgba(27,107,82,0.1)' : 'transparent',
                  color: caseDetailTab === tab.key ? 'var(--color-pb-primary)' : 'var(--color-pb-text-muted)',
                }}>
                <i className={`fas ${tab.icon}`}></i> {tab.label}
              </button>
            ))}
          </div>

          {loadingDetail ? (
            <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--color-pb-doctor)' }}></i></div>
          ) : (
            <>
              {caseDetailTab === 'treatment' && (
                <div style={{ padding: 24, borderRadius: 18, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>Treatment Report</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label className="pb-label">Diagnosis</label>
                      <input className="pb-input" value={reportForm.diagnosis} onChange={e => setReportForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="Primary diagnosis..." />
                    </div>
                    <div>
                      <label className="pb-label">Treatment Plan</label>
                      <textarea className="pb-textarea" value={reportForm.treatment} onChange={e => setReportForm(f => ({ ...f, treatment: e.target.value }))} placeholder="Describe the treatment plan..." rows={3} />
                    </div>
                    <div>
                      <label className="pb-label">Medications</label>
                      <textarea className="pb-textarea" value={reportForm.medications} onChange={e => setReportForm(f => ({ ...f, medications: e.target.value }))} placeholder="List medications prescribed..." rows={2} />
                    </div>
                    <div>
                      <label className="pb-label">Notes</label>
                      <textarea className="pb-textarea" value={reportForm.notes} onChange={e => setReportForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." rows={2} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label className="pb-label">Follow-up Date</label>
                        <input className="pb-input" type="date" value={reportForm.followUpDate} onChange={e => setReportForm(f => ({ ...f, followUpDate: e.target.value }))} />
                      </div>
                      <div>
                        <label className="pb-label">Estimated Cost (₹)</label>
                        <input className="pb-input" type="number" value={reportForm.estimatedCost} onChange={e => setReportForm(f => ({ ...f, estimatedCost: e.target.value }))} placeholder="0.00" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={saveReport} disabled={savingReport} style={{ flex: 1 }}>
                        {savingReport ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> Save Report</>}
                      </button>
                      <button className="btn btn-secondary" onClick={() => downloadPrescription(viewingCaseDetail)}>
                        <i className="fas fa-file-pdf"></i> Download Prescription PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {caseDetailTab === 'photos' && (
                <div style={{ padding: 24, borderRadius: 18, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>Treatment Photos</h3>
                  <PhotoSection title="Pre-Treatment" icon="fa-clipboard-check" photos={casePhotos.pre_treatment || []} caseCode={detailCase.incidentCode} photoType="pre_treatment" uid={uid} showToast={showToast} onPhotoAdded={refreshCaseDetail} />
                  <PhotoSection title="During Treatment" icon="fa-heart-pulse" photos={casePhotos.during_treatment || []} caseCode={detailCase.incidentCode} photoType="during_treatment" uid={uid} showToast={showToast} onPhotoAdded={refreshCaseDetail} />
                  <PhotoSection title="Post-Treatment" icon="fa-circle-check" photos={casePhotos.post_treatment || []} caseCode={detailCase.incidentCode} photoType="post_treatment" uid={uid} showToast={showToast} onPhotoAdded={refreshCaseDetail} />
                  <PhotoSection title="Medical Reports" icon="fa-file-medical" photos={casePhotos.medical_report || []} caseCode={detailCase.incidentCode} photoType="medical_report" uid={uid} showToast={showToast} onPhotoAdded={refreshCaseDetail} />
                </div>
              )}

              {caseDetailTab === 'timeline' && (
                <div style={{ padding: 24, borderRadius: 18, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>Case Timeline</h3>
                  {caseTimeline.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {caseTimeline.map((step, i) => {
                        const stage = CASE_WORKFLOW_STAGES.find(s => s.key === step.status);
                        const isCurrent = i === caseTimeline.length - 1;
                        return (
                          <div key={step.id || i} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                              <div style={{ width: isCurrent ? 28 : 22, height: isCurrent ? 28 : 22, borderRadius: '50%', background: isCurrent ? (stage?.color || 'var(--color-pb-primary)') : 'var(--color-pb-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: stage?.animate && isCurrent ? 'pulse 2s ease-in-out infinite' : 'none' }}>
                                <i className={`fas ${stage?.icon || 'fa-circle-dot'}`} style={{ fontSize: '0.6rem', color: '#fff' }}></i>
                              </div>
                              {i < caseTimeline.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: 'var(--color-pb-primary)', margin: '2px 0' }}></div>}
                            </div>
                            <div style={{ paddingBottom: 20, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{stage?.label || step.status || 'Event'}</span>
                                {isCurrent && <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: `${stage?.color || 'var(--color-pb-primary)'}15`, color: stage?.color || 'var(--color-pb-primary)', letterSpacing: '0.05em' }}>latest</span>}
                              </div>
                              {step.note && <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.4 }}>{step.note}</div>}
                              {step.meta?.requiresPin && <div style={{ fontSize: '0.72rem', color: 'var(--color-pb-accent)', marginTop: 2 }}><i className="fas fa-lock" style={{ marginRight: 4 }}></i>PIN verified</div>}
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)', marginTop: 2 }}>
                                {step.createdAt ? new Date(step.createdAt).toLocaleString() : ''}
                                {step.actorType ? ` · ${step.actorType}` : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-pb-text-muted)', fontSize: '0.85rem' }}>No timeline data yet.</div>
                  )}
                </div>
              )}

              {caseDetailTab === 'expenses' && (
                <div style={{ padding: 24, borderRadius: 18, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>Expenses</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, marginBottom: 16, alignItems: 'end' }}>
                    <div>
                      <label className="pb-label">Description</label>
                      <input className="pb-input" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. X-ray scan" />
                    </div>
                    <div style={{ width: 120 }}>
                      <label className="pb-label">Amount (₹)</label>
                      <input className="pb-input" type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
                    </div>
                    <div style={{ width: 130 }}>
                      <label className="pb-label">Category</label>
                      <select className="pb-select" value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                        <option value="medicine">Medicine</option>
                        <option value="surgery">Surgery</option>
                        <option value="boarding">Boarding</option>
                        <option value="transport">Transport</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={addExpense} disabled={addingExpense || !expenseForm.description || !expenseForm.amount}>
                      {addingExpense ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-plus"></i> Add</>}
                    </button>
                  </div>

                  {caseExpenses.expenses && caseExpenses.expenses.length > 0 ? (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(27,107,82,0.04)', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-pb-text-muted)' }}>Description</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-pb-text-muted)' }}>Category</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-pb-text-muted)', textAlign: 'right' }}>Amount</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-pb-text-muted)', textAlign: 'right' }}>Date</span>
                      </div>
                      {caseExpenses.expenses.map((exp) => (
                        <div key={exp.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--color-pb-border)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{exp.description}</span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-secondary)' }}><span className="badge badge-teal">{exp.category}</span></span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'right' }}>₹{Number(exp.amount).toLocaleString()}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', textAlign: 'right' }}>{exp.createdAt ? new Date(exp.createdAt).toLocaleDateString() : ''}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--color-pb-text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>No expenses added yet.</div>
                  )}

                  <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(27,107,82,0.04)', border: '1px solid var(--color-pb-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)' }}>Subtotal</span>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>₹{caseExpenses.totals?.subtotal?.toLocaleString() || '0'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)' }}>Commission ({caseExpenses.totals?.commissionPct || 15}%)</span>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-pb-accent)' }}>₹{caseExpenses.totals?.commission?.toLocaleString() || '0'}</span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-pb-border-strong)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>Grand Total</span>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-pb-primary)' }}>₹{caseExpenses.totals?.grandTotal?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
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
                <button className="btn btn-primary btn-sm" onClick={() => setShowKyc(true)}><i className="fas fa-file-upload"></i> Submit KYC</button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderBottom: i < steps.length - 1 ? '1px solid var(--color-pb-border)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.done ? 'rgba(27,107,82,0.1)' : 'rgba(123,145,153,0.1)', color: step.done ? 'var(--color-pb-primary)' : 'var(--color-pb-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fas ${step.done ? 'fa-check' : 'fa-circle'}`} style={{ fontSize: step.done ? '0.7rem' : '0.4rem' }}></i>
                  </div>
                  <div><div style={{ fontWeight: 700, fontSize: '0.88rem', color: step.done ? 'var(--color-pb-text)' : 'var(--color-pb-text-muted)' }}>{step.label}</div></div>
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
                {cases.map((c, i) => {
                  const stage = getWorkflowStage(c.workflowStatus || c.status || 'reported');
                  const progress = getProgressPercent(c.workflowStatus || c.status || 'reported');
                  return (
                    <div key={i} style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-pb-doctor)'; e.currentTarget.style.background = 'rgba(37,99,235,0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-pb-border)'; e.currentTarget.style.background = 'var(--color-pb-surface)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stage.color}15`, color: stage.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`fas ${getAnimalIcon(c.animalType)}`} style={{ fontSize: '0.9rem' }}></i>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.animalType || 'Animal'}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(27,107,82,0.06)', padding: '2px 8px', borderRadius: 6 }}>{c.incidentCode || `#${c.id}`}</span>
                          </div>
                          {c.ngoName && <div style={{ fontSize: '0.75rem', color: 'var(--color-pb-text-muted)' }}>NGO: {c.ngoName}</div>}
                          {c.repName && <div style={{ fontSize: '0.75rem', color: 'var(--color-pb-text-muted)' }}>Rider: {c.repName}</div>}
                          <div className="workflow-progress-bar" style={{ marginTop: 6, width: '100%', maxWidth: 200 }}>
                            <div className="workflow-progress-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ padding: '4px 10px', borderRadius: 16, background: `${stage.color}15`, color: stage.color, fontWeight: 700, fontSize: '0.72rem' }}>
                          <i className={`fas ${stage.icon}`} style={{ marginRight: 3 }}></i>{stage.label}
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => openCaseDetail(c)} style={{ padding: '8px 14px', fontSize: '0.78rem' }}>
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>Profile</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowProfile(true)}><i className="fas fa-pen"></i> Edit</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div><div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Name</div><div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{profile?.name || '—'}</div></div>
              <div><div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Email</div><div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{profile?.email || '—'}</div></div>
              <div><div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Phone</div><div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{profile?.phone || '—'}</div></div>
              <div><div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Specialization</div><div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{doctor?.specialization || '—'}</div></div>
              <div><div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>Hospital</div><div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{doctor?.hospitalName || '—'}</div></div>
              <div><div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>PRN</div><div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{doctor?.prn || '—'}</div></div>
            </div>
          </div>

          <div className="glass" style={{ padding: 24, marginTop: 24 }}>
            <SupportWidget uid={uid} email={profile?.email} name={profile?.name} userType="doctor" />
          </div>
        </div>
      )}

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
                <div><label className="pb-label">PRN Number</label><input className="pb-input" value={doctor?.prn || ''} disabled style={{ opacity: 0.6 }} /></div>
                <div><label className="pb-label">Specialization</label><input className="pb-input" value={kycForm.specialization} onChange={e => setKycForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Surgery, Orthopedics, General" /></div>
                <div><label className="pb-label">License Number</label><input className="pb-input" value={kycForm.licenseNumber} onChange={e => setKycForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="Your veterinary license number" /></div>
                <div><label className="pb-label">Hospital Name</label><input className="pb-input" value={kycForm.hospitalName} onChange={e => setKycForm(f => ({ ...f, hospitalName: e.target.value }))} placeholder="Hospital or clinic name" /></div>
                <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(27,107,82,0.04)', border: '1px solid var(--color-pb-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--color-pb-primary)' }}><i className="fas fa-id-card" style={{ marginRight: 6 }}></i>Personal Identity (Required)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <FileUploadField label="PAN Card" value={kycDocs.pan} onChange={v => setKycDocs(f => ({ ...f, pan: v }))} required />
                    <FileUploadField label="Aadhaar Card" value={kycDocs.aadhaar} onChange={v => setKycDocs(f => ({ ...f, aadhaar: v }))} required />
                    <FileUploadField label="Passport-size Photograph" value={kycDocs.photograph} onChange={v => setKycDocs(f => ({ ...f, photograph: v }))} required />
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(37,99,235,0.04)', border: '1px solid var(--color-pb-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--color-pb-doctor)' }}><i className="fas fa-user-md" style={{ marginRight: 6 }}></i>Professional Documents (Required for Vets)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <FileUploadField label="VCI Registration Certificate" value={kycDocs.vciRegistration} onChange={v => setKycDocs(f => ({ ...f, vciRegistration: v }))} required />
                    <FileUploadField label="IVPR Entry Copy" value={kycDocs.ivprEntry} onChange={v => setKycDocs(f => ({ ...f, ivprEntry: v }))} required />
                    <FileUploadField label="BVSc Degree Certificate" value={kycDocs.bvscDegree} onChange={v => setKycDocs(f => ({ ...f, bvscDegree: v }))} required />
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(212,160,23,0.04)', border: '1px solid var(--color-pb-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--color-pb-accent)' }}><i className="fas fa-building" style={{ marginRight: 6 }}></i>Business Documents (Optional)</div>
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
                <div><label className="pb-label">Name</label><input className="pb-input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="pb-label">Email</label><input className="pb-input" value={profile?.email || ''} disabled style={{ opacity: 0.6 }} /></div>
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
