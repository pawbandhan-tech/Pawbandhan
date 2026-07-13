'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

function adminFetch(url, opts = {}) {
  const token = sessionStorage.getItem('pb_admin_token');
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
}

export default function AdminPortalClient() {
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState({ rescues: 0, ngos: 0, doctors: 0, riders: 0 });
  const [cases, setCases] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [stories, setStories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [siteConfig, setSiteConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNgo, setEditingNgo] = useState(null);
  const [editingStory, setEditingStory] = useState(null);
  const [editingReview, setEditingReview] = useState(null);

  // KYC Review state
  const [kycSubmissions, setKycSubmissions] = useState([]);
  const [reviewingKyc, setReviewingKyc] = useState(null);
  const [kycActionReason, setKycActionReason] = useState('');

  // Onboarding state
  const [onboardingEntities, setOnboardingEntities] = useState([]);
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  // CMS state
  const [cmsTab, setCmsTab] = useState('news');
  const [cmsData, setCmsData] = useState({});
  const [editingCmsItem, setEditingCmsItem] = useState(null);
  const [showCmsModal, setShowCmsModal] = useState(false);

  // Account creation modals
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateNgo, setShowCreateNgo] = useState(false);
  const [showCreateDoctor, setShowCreateDoctor] = useState(false);
  const [showCreateRider, setShowCreateRider] = useState(false);

  // Logo preview
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('pb_admin_token');
    if (!token) { router.push('/admin/login'); return; }
    fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setAdmin(d.admin))
      .catch(() => { sessionStorage.removeItem('pb_admin_token'); router.push('/admin/login'); });
  }, [router]);

  const loadTab = useCallback(async (t) => {
    setLoading(true);
    try {
      if (t === 'dashboard') {
        const [s, c] = await Promise.all([fetch('/api/stats').then(r => r.json()), adminFetch('/api/admin/cases').then(r => r.json())]);
        setStats(s); setCases(Array.isArray(c) ? c : []);
      } else if (t === 'cases') {
        const c = await adminFetch('/api/admin/cases').then(r => r.json());
        setCases(Array.isArray(c) ? c : []);
      } else if (t === 'accounts') {
        const a = await adminFetch('/api/admin/all-accounts').then(r => r.json());
        setAccounts(Array.isArray(a) ? a : []);
      } else if (t === 'ngos') {
        const n = await adminFetch('/api/admin/verified-ngos').then(r => r.json());
        setNgos(Array.isArray(n) ? n : []);
      } else if (t === 'kyc') {
        const k = await adminFetch('/api/admin/kyc-review').then(r => r.json());
        setKycSubmissions(Array.isArray(k.submissions) ? k.submissions : []);
      } else if (t === 'onboarding') {
        await loadOnboardingEntities();
      } else if (t === 'stories') {
        const [st, sc] = await Promise.all([adminFetch('/api/admin/stories').then(r => r.json()), adminFetch('/api/admin/site-config').then(r => r.json())]);
        setStories(Array.isArray(st) ? st : []); setSiteConfig(sc || {});
      } else if (t === 'reviews') {
        const [rv, sc] = await Promise.all([adminFetch('/api/admin/reviews').then(r => r.json()), adminFetch('/api/admin/site-config').then(r => r.json())]);
        setReviews(Array.isArray(rv) ? rv : []); setSiteConfig(sc || {});
      } else if (t === 'cms') {
        const cms = await adminFetch('/api/admin/cms').then(r => r.json());
        setCmsData(cms || {});
      } else if (t === 'settings') {
        const sc = await adminFetch('/api/admin/site-config').then(r => r.json());
        setSiteConfig(sc || {});
        if (sc && sc.logo_url) setLogoPreview(sc.logo_url);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { if (admin) loadTab(tab); }, [admin, tab, loadTab]);

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  function logout() { sessionStorage.removeItem('pb_admin_token'); sessionStorage.removeItem('pb_admin_profile'); router.push('/admin/login'); }

  const tabs = [
    { key: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { key: 'cases', icon: 'fa-folder-open', label: 'Cases' },
    { key: 'accounts', icon: 'fa-users', label: 'All Accounts' },
    { key: 'ngos', icon: 'fa-building', label: 'NGOs' },
    { key: 'kyc', icon: 'fa-id-card', label: 'KYC Review' },
    { key: 'onboarding', icon: 'fa-user-check', label: 'Onboarding' },
    { key: 'stories', icon: 'fa-book-open', label: 'Stories' },
    { key: 'reviews', icon: 'fa-star', label: 'Reviews' },
    { key: 'cms', icon: 'fa-newspaper', label: 'CMS' },
    { key: 'settings', icon: 'fa-gear', label: 'Site Config' },
  ];

  const filteredAccounts = accounts.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (a._label || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q) || (a._type || '').toLowerCase().includes(q);
  });

  const typeColors = { customer: 'badge-green', ngo: 'badge-teal', doctor: 'badge-blue', rider: 'badge-orange', representative: 'badge-gold' };

  async function saveSiteConfig(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = {};
    form.forEach((v, k) => { if (v) data[k] = v; });
    const res = await adminFetch('/api/admin/site-config', { method: 'POST', body: JSON.stringify(data) });
    if (res.ok) { showToast('Site config saved'); loadTab('settings'); }
    else showToast('Failed to save', 'error');
  }

  async function saveStory(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    if (editingStory?.id) data.id = editingStory.id;
    const method = editingStory?.id ? 'PUT' : 'POST';
    const res = await adminFetch('/api/admin/stories', { method, body: JSON.stringify(data) });
    if (res.ok) { showToast('Story saved'); setEditingStory(null); loadTab('stories'); }
    else showToast('Failed to save', 'error');
  }

  async function saveReview(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    if (data.rating) data.rating = parseInt(data.rating);
    if (data.isFeatured) data.isFeatured = data.isFeatured === 'true';
    if (editingReview?.id) data.id = editingReview.id;
    const method = editingReview?.id ? 'PUT' : 'POST';
    const res = await adminFetch('/api/admin/reviews', { method, body: JSON.stringify(data) });
    if (res.ok) { showToast('Review saved'); setEditingReview(null); loadTab('reviews'); }
    else showToast('Failed to save', 'error');
  }

  async function saveNgoEdit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    data.id = editingNgo.id;
    const res = await adminFetch('/api/admin/update-ngo', { method: 'POST', body: JSON.stringify(data) });
    if (res.ok) { showToast('NGO updated'); setEditingNgo(null); loadTab('ngos'); }
    else showToast('Failed to update', 'error');
  }

  async function toggleUserStatus(user) {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const res = await adminFetch('/api/admin/update-user', { method: 'POST', body: JSON.stringify({ id: user.id, status: newStatus }) });
    if (res.ok) { showToast(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`); loadTab('accounts'); }
    else showToast('Failed to update user', 'error');
  }

  async function createUser(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    const res = await adminFetch('/api/admin/create-user', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { showToast('User created'); setShowCreateUser(false); loadTab('accounts'); }
    else showToast(json.error || 'Failed to create user', 'error');
  }

  async function createNgo(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    const res = await adminFetch('/api/admin/create-ngo', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { showToast('NGO created'); setShowCreateNgo(false); loadTab('ngos'); }
    else showToast(json.error || 'Failed to create NGO', 'error');
  }

  async function createDoctor(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    const res = await adminFetch('/api/admin/create-doctor', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { showToast('Doctor created'); setShowCreateDoctor(false); loadTab('accounts'); }
    else showToast(json.error || 'Failed to create doctor', 'error');
  }

  async function createRider(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    if (data.ngoId) data.ngoId = parseInt(data.ngoId, 10);
    else delete data.ngoId;
    const res = await adminFetch('/api/admin/create-rider', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { showToast('Rider created'); setShowCreateRider(false); loadTab('accounts'); }
    else showToast(json.error || 'Failed to create rider', 'error');
  }

  // KYC Review functions
  async function handleKycAction(entity, action) {
    if ((action === 'reject' || action === 'request_reupload') && !kycActionReason.trim()) {
      showToast('Reason is required', 'error');
      return;
    }
    const res = await adminFetch('/api/admin/kyc-review', {
      method: 'POST',
      body: JSON.stringify({
        entityType: entity.entityType,
        entityId: entity.id,
        action,
        rejectionReason: kycActionReason || undefined,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast(action === 'approve' ? 'KYC approved' : action === 'reject' ? 'KYC rejected' : 'Reupload requested');
      setReviewingKyc(null);
      setKycActionReason('');
      loadTab('kyc');
    } else {
      showToast(json.error || 'Action failed', 'error');
    }
  }

  // Onboarding functions
  async function loadOnboardingEntities() {
    setOnboardingLoading(true);
    try {
      const aRes = await adminFetch('/api/admin/all-accounts').then(r => r.json());
      const allAccounts = Array.isArray(aRes) ? aRes : [];
      const needsOnboarding = allAccounts.filter(a =>
        a._type === 'ngo' || a._type === 'doctor' || a._type === 'rider' || a._type === 'representative'
      );
      const results = await Promise.all(
        needsOnboarding.slice(0, 50).map(a =>
          adminFetch(`/api/admin/onboarding?entityType=${a._type}&entityId=${a.id}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      );
      setOnboardingEntities(results.filter(Boolean));
    } catch (e) { console.error(e); }
    setOnboardingLoading(false);
  }

  async function handleOnboardingAction(entity, action) {
    const res = await adminFetch('/api/admin/onboarding', {
      method: 'POST',
      body: JSON.stringify({ entityType: entity.entityType, entityId: entity.entityId, action }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast(action === 'initiate_agreement' ? 'Agreement initiated' : action === 'sign_agreement' ? 'Agreement signed' : 'Onboarding completed');
      setSelectedOnboarding(null);
      loadTab('onboarding');
    } else {
      showToast(json.error || 'Action failed', 'error');
    }
  }

  // CMS functions
  async function saveCmsCollectionItem(collectionKey, itemData, itemId) {
    const action = itemId ? 'update' : 'create';
    const res = await adminFetch('/api/admin/cms', {
      method: 'POST',
      body: JSON.stringify({ action, id: itemId, data: { ...itemData, collectionKey } }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast('Item saved');
      setShowCmsModal(false);
      setEditingCmsItem(null);
      loadTab('cms');
    } else {
      showToast(json.error || 'Failed to save', 'error');
    }
  }

  async function deleteCmsItem(collectionKey, itemId) {
    if (!confirm('Delete this item?')) return;
    const res = await adminFetch('/api/admin/cms', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id: itemId, collectionKey }),
    });
    if (res.ok) { showToast('Item deleted'); loadTab('cms'); }
    else showToast('Failed to delete', 'error');
  }

  async function saveCmsSetting(key, value) {
    const res = await adminFetch('/api/admin/cms', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) { showToast('Setting saved'); loadTab('cms'); }
    else showToast('Failed to save', 'error');
  }

  function handleLogoFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target.result);
      setSiteConfig(prev => ({ ...prev, logo_url: ev.target.result }));
    };
    reader.readAsDataURL(file);
  }

  function getCmsItems(key) {
    const val = cmsData[key];
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') { try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; } }
    return [];
  }

  function openCmsCreateModal(collectionKey) {
    setEditingCmsItem({ collectionKey, isNew: true });
    setShowCmsModal(true);
  }

  function openCmsEditModal(collectionKey, item) {
    setEditingCmsItem({ collectionKey, ...item, isNew: false });
    setShowCmsModal(true);
  }

  async function saveCmsModalItem(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    if (data.isActive !== undefined) data.isActive = data.isActive === 'true' || data.isActive === true;
    if (data.sortOrder) data.sortOrder = parseInt(data.sortOrder, 10);
    if (data.priority) data.priority = data.priority;
    if (editingCmsItem.isNew) {
      await saveCmsCollectionItem(editingCmsItem.collectionKey, data);
    } else {
      await saveCmsCollectionItem(editingCmsItem.collectionKey, data, editingCmsItem.id);
    }
  }

  if (!admin) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--color-pb-primary)' }}></i></div>;

  return (
    <div className="portal-layout">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}><i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>{toast.msg}</div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="portal-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 4px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-pb-primary), var(--color-pb-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <i className="fas fa-paw"></i>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>PawBandhan</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-pb-text-muted)' }}>Admin Portal</div>
          </div>
        </div>

        {tabs.map(t => (
          <button key={t.key} className={`sidebar-nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <i className={`fas ${t.icon}`} style={{ width: 20, textAlign: 'center' }}></i> {t.label}
          </button>
        ))}

        <div style={{ flex: 1 }}></div>
        <div style={{ padding: '12px 4px', borderTop: '1px solid var(--color-pb-border)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>{admin.email}</div>
          <button className="sidebar-nav-item" onClick={logout} style={{ color: 'var(--color-pb-danger)' }}>
            <i className="fas fa-right-from-bracket" style={{ width: 20, textAlign: 'center' }}></i> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="portal-main">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', margin: 0 }}>
            {tabs.find(t => t.key === tab)?.label || 'Dashboard'}
          </h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--color-pb-primary)' }}></i></div>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {tab === 'dashboard' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {[
                    { label: 'Total Rescues', value: stats.rescues, icon: 'fa-heart', color: 'var(--color-pb-primary)' },
                    { label: 'Active NGOs', value: stats.ngos, icon: 'fa-building', color: 'var(--color-pb-ngo)' },
                    { label: 'Vet Doctors', value: stats.doctors, icon: 'fa-stethoscope', color: 'var(--color-pb-doctor)' },
                    { label: 'Field Rescuers', value: stats.riders, icon: 'fa-motorcycle', color: 'var(--color-pb-rep)' },
                  ].map((s, i) => (
                    <div key={i} className="glass" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`fas ${s.icon}`}></i>
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem' }}>{s.value.toLocaleString()}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{s.label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="glass" style={{ padding: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 16px' }}>Recent Cases</h3>
                  {cases.length === 0 ? <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.88rem' }}>No cases yet.</p> : (
                    <table className="pb-table">
                      <thead><tr><th>Code</th><th>Animal</th><th>Status</th><th>Created</th></tr></thead>
                      <tbody>
                        {cases.slice(0, 10).map(c => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.incidentCode || `#${c.id}`}</td>
                            <td>{c.animalType || '—'}</td>
                            <td><span className="badge badge-green">{c.status || c.workflowStatus || 'open'}</span></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* CASES TAB */}
            {tab === 'cases' && (
              <div className="glass" style={{ padding: 24 }}>
                {cases.length === 0 ? <p style={{ color: 'var(--color-pb-text-muted)' }}>No cases found.</p> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pb-table">
                      <thead><tr><th>Code</th><th>Animal</th><th>NGO</th><th>Status</th><th>Workflow</th><th>Created</th></tr></thead>
                      <tbody>
                        {cases.map(c => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.incidentCode || `#${c.id}`}</td>
                            <td>{c.animalType || '—'}</td>
                            <td>{c.ngoName || '—'}</td>
                            <td><span className="badge badge-green">{c.status || 'open'}</span></td>
                            <td><span className="badge badge-gold">{c.workflowStatus || '—'}</span></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ALL ACCOUNTS TAB */}
            {tab === 'accounts' && (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="pb-input" placeholder="Search by name, email, or type…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ maxWidth: 400 }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)' }}>{filteredAccounts.length} accounts</span>
                  <div style={{ flex: 1 }}></div>
                  <button className="btn btn-primary" onClick={() => setShowCreateUser(true)}><i className="fas fa-plus"></i> Create User</button>
                  <button className="btn btn-secondary" onClick={() => setShowCreateDoctor(true)}><i className="fas fa-user-md"></i> Create Doctor</button>
                  <button className="btn btn-secondary" onClick={() => setShowCreateRider(true)}><i className="fas fa-motorcycle"></i> Create Rider</button>
                </div>
                <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pb-table">
                      <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                      <tbody>
                        {filteredAccounts.map((a, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{a._label}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)' }}>{a.email || '—'}</td>
                            <td><span className={`badge ${typeColors[a._type] || 'badge-green'}`}>{a._type}</span></td>
                            <td><span className="badge badge-blue">{a.role || a._type}</span></td>
                            <td><span className={`badge ${a.status === 'active' ? 'badge-green' : a.status === 'pending' ? 'badge-gold' : 'badge-red'}`}>{a.status || '—'}</span></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                            <td>
                              <button className={`btn btn-sm ${a.status === 'active' ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleUserStatus(a)} title={a.status === 'active' ? 'Suspend' : 'Activate'}>
                                <i className={`fas ${a.status === 'active' ? 'fa-ban' : 'fa-check'}`}></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Create User Modal */}
                {showCreateUser && (
                  <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Create User</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCreateUser(false)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" required /></div>
                          <div><label className="pb-label">Email</label><input className="pb-input" name="email" type="email" required /></div>
                          <div><label className="pb-label">Phone</label><input className="pb-input" name="phone" required /></div>
                          <div><label className="pb-label">Password</label><input className="pb-input" name="password" type="password" required /></div>
                          <div><label className="pb-label">Role</label>
                            <select className="pb-select" name="role" required>
                              <option value="">Select role…</option>
                              <option value="admin">Admin</option>
                              <option value="staff">Staff</option>
                              <option value="co-admin">Co-Admin</option>
                              <option value="customer">Customer</option>
                            </select>
                          </div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-plus"></i> Create User</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* Create Doctor Modal */}
                {showCreateDoctor && (
                  <div className="modal-overlay" onClick={() => setShowCreateDoctor(false)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Create Doctor</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCreateDoctor(false)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={createDoctor} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" required /></div>
                          <div><label className="pb-label">Email</label><input className="pb-input" name="email" type="email" required /></div>
                          <div><label className="pb-label">Phone</label><input className="pb-input" name="phone" required /></div>
                          <div><label className="pb-label">Specialization</label><input className="pb-input" name="specialization" /></div>
                          <div><label className="pb-label">License Number</label><input className="pb-input" name="licenseNumber" /></div>
                          <div><label className="pb-label">Hospital Name</label><input className="pb-input" name="hospitalName" /></div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-plus"></i> Create Doctor</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* Create Rider Modal */}
                {showCreateRider && (
                  <div className="modal-overlay" onClick={() => setShowCreateRider(false)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Create Rider</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCreateRider(false)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={createRider} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" required /></div>
                          <div><label className="pb-label">Email</label><input className="pb-input" name="email" type="email" required /></div>
                          <div><label className="pb-label">Phone</label><input className="pb-input" name="phone" required /></div>
                          <div><label className="pb-label">Vehicle Type</label><input className="pb-input" name="vehicleType" /></div>
                          <div><label className="pb-label">Vehicle Number</label><input className="pb-input" name="vehicleNumber" /></div>
                          <div><label className="pb-label">License Number</label><input className="pb-input" name="licenseNumber" /></div>
                          <div><label className="pb-label">NGO ID (optional)</label><input className="pb-input" name="ngoId" type="number" /></div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-plus"></i> Create Rider</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NGOS TAB */}
            {tab === 'ngos' && (
              <div>
                {editingNgo && (
                  <div className="modal-overlay" onClick={() => setEditingNgo(null)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Edit NGO</h3><button className="btn btn-ghost btn-icon" onClick={() => setEditingNgo(null)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={saveNgoEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {['name', 'email', 'phone', 'city', 'state', 'address', 'serviceArea', 'workType'].map(f => (
                            <div key={f}><label className="pb-label">{f.replace(/([A-Z])/g, ' $1')}</label><input className="pb-input" name={f} defaultValue={editingNgo[f] || ''} /></div>
                          ))}
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-check"></i> Save changes</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {showCreateNgo && (
                  <div className="modal-overlay" onClick={() => setShowCreateNgo(false)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Create NGO</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCreateNgo(false)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={createNgo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" required /></div>
                          <div><label className="pb-label">Email</label><input className="pb-input" name="email" type="email" required /></div>
                          <div><label className="pb-label">Phone</label><input className="pb-input" name="phone" required /></div>
                          <div><label className="pb-label">NGO Type</label><input className="pb-input" name="ngoType" /></div>
                          <div><label className="pb-label">Registration Number</label><input className="pb-input" name="regNumber" /></div>
                          <div><label className="pb-label">PAN Number</label><input className="pb-input" name="panNumber" /></div>
                          <div><label className="pb-label">Address</label><input className="pb-input" name="address" /></div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div><label className="pb-label">City</label><input className="pb-input" name="city" /></div>
                            <div><label className="pb-label">State</label><input className="pb-input" name="state" /></div>
                          </div>
                          <div><label className="pb-label">Service Area</label><input className="pb-input" name="serviceArea" /></div>
                          <div><label className="pb-label">Work Type</label><input className="pb-input" name="workType" /></div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-plus"></i> Create NGO</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <button className="btn btn-primary" onClick={() => setShowCreateNgo(true)}><i className="fas fa-plus"></i> Create NGO</button>
                </div>
                <div className="glass" style={{ padding: 24 }}>
                  {ngos.length === 0 ? <p style={{ color: 'var(--color-pb-text-muted)' }}>No NGOs found.</p> : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="pb-table">
                        <thead><tr><th>Name</th><th>Email</th><th>PRN</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                          {ngos.map(n => (
                            <tr key={n.id}>
                              <td style={{ fontWeight: 600 }}>{n.name}</td>
                              <td style={{ fontSize: '0.85rem' }}>{n.email}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{n.prn || '—'}</td>
                              <td><span className={`badge ${n.status === 'active' ? 'badge-green' : n.status === 'suspended' ? 'badge-red' : 'badge-gold'}`}>{n.status}</span></td>
                              <td><button className="btn btn-secondary btn-sm" onClick={() => setEditingNgo(n)}><i className="fas fa-pen"></i> Edit</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KYC REVIEW TAB */}
            {tab === 'kyc' && (
              <div>
                {reviewingKyc && (
                  <div className="modal-overlay" onClick={() => { setReviewingKyc(null); setKycActionReason(''); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
                      <div className="modal-header">
                        <h3>KYC Review — {reviewingKyc.name || reviewingKyc._label || 'Entity'}</h3>
                        <button className="btn btn-ghost btn-icon" onClick={() => { setReviewingKyc(null); setKycActionReason(''); }}><i className="fas fa-xmark"></i></button>
                      </div>
                      <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                          <div><label className="pb-label">Entity Name</label><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{reviewingKyc.name || '—'}</div></div>
                          <div><label className="pb-label">Type</label><div><span className={`badge ${typeColors[reviewingKyc.entityType] || 'badge-green'}`}>{reviewingKyc.entityLabel || reviewingKyc.entityType}</span></div></div>
                          <div><label className="pb-label">Email</label><div style={{ fontSize: '0.9rem' }}>{reviewingKyc.email || '—'}</div></div>
                          <div><label className="pb-label">Phone</label><div style={{ fontSize: '0.9rem' }}>{reviewingKyc.phone || '—'}</div></div>
                          <div><label className="pb-label">PRN / ID</label><div style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{reviewingKyc.prn || reviewingKyc.riderId || '—'}</div></div>
                          <div><label className="pb-label">Status</label><div><span className={`badge ${reviewingKyc.status === 'active' ? 'badge-green' : reviewingKyc.status === 'pending' || reviewingKyc.status === 'kyc_submitted' ? 'badge-gold' : 'badge-red'}`}>{reviewingKyc.status}</span></div></div>
                          <div><label className="pb-label">Submitted</label><div style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-muted)' }}>{reviewingKyc.createdAt ? new Date(reviewingKyc.createdAt).toLocaleString() : '—'}</div></div>
                        </div>

                        {reviewingKyc.entityType === 'doctor' && (
                          <div style={{ marginBottom: 20 }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 10px', fontSize: '0.95rem' }}>Doctor KYC Documents</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {[
                                { label: 'VCI Registration', key: 'vciRegistration' },
                                { label: 'IVPR Entry', key: 'ivprEntry' },
                                { label: 'Degree Certificate', key: 'degreeCertificate' },
                                { label: 'PAN Card', key: 'pan' },
                                { label: 'Aadhaar Card', key: 'aadhaar' },
                                { label: 'GSTIN', key: 'gstin' },
                              ].map(doc => {
                                const kycData = reviewingKyc.kycData && typeof reviewingKyc.kycData === 'object' ? reviewingKyc.kycData : {};
                                const documents = kycData.documents || {};
                                const val = documents[doc.key] || kycData[doc.key];
                                return (
                                  <div key={doc.key} className="glass" style={{ padding: 10, fontSize: '0.82rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{doc.label}</div>
                                    {val ? (
                                      typeof val === 'string' && val.startsWith('http') ? (
                                        <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)', wordBreak: 'break-all' }}>
                                          <i className="fas fa-external-link-alt"></i> View document
                                        </a>
                                      ) : (
                                        <span style={{ color: 'var(--color-pb-text-secondary)' }}>{String(val)}</span>
                                      )
                                    ) : (
                                      <span style={{ color: 'var(--color-pb-text-muted)' }}>Not provided</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {reviewingKyc.entityType === 'ngo' && (
                          <div style={{ marginBottom: 20 }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 10px', fontSize: '0.95rem' }}>NGO KYC Documents</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {[
                                { label: 'Registration Certificate', key: 'registrationCert' },
                                { label: 'Trust Deed', key: 'trustDeed' },
                                { label: 'PAN Card', key: 'pan' },
                                { label: 'Address Proof', key: 'addressProof' },
                                { label: 'Committee Resolution', key: 'committeeResolution' },
                                { label: 'Trustee OVD', key: 'trusteeOvd' },
                                { label: 'Power of Attorney', key: 'poa' },
                              ].map(doc => {
                                const kycData = reviewingKyc.kycData && typeof reviewingKyc.kycData === 'object' ? reviewingKyc.kycData : {};
                                const documents = kycData.documents || {};
                                const val = documents[doc.key] || kycData[doc.key];
                                return (
                                  <div key={doc.key} className="glass" style={{ padding: 10, fontSize: '0.82rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{doc.label}</div>
                                    {val ? (
                                      typeof val === 'string' && val.startsWith('http') ? (
                                        <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)', wordBreak: 'break-all' }}>
                                          <i className="fas fa-external-link-alt"></i> View document
                                        </a>
                                      ) : (
                                        <span style={{ color: 'var(--color-pb-text-secondary)' }}>{String(val)}</span>
                                      )
                                    ) : (
                                      <span style={{ color: 'var(--color-pb-text-muted)' }}>Not provided</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {reviewingKyc.entityType === 'rider' && (
                          <div style={{ marginBottom: 20 }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 10px', fontSize: '0.95rem' }}>Rider KYC Documents</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {[
                                { label: 'Aadhaar Card', key: 'aadhaar' },
                                { label: 'PAN Card', key: 'pan' },
                                { label: 'Driving License', key: 'drivingLicense' },
                                { label: 'Vehicle RC', key: 'vehicleRc' },
                                { label: 'Insurance', key: 'insurance' },
                              ].map(doc => {
                                const kycData = reviewingKyc.kycData && typeof reviewingKyc.kycData === 'object' ? reviewingKyc.kycData : {};
                                const documents = kycData.documents || {};
                                const val = documents[doc.key] || kycData[doc.key];
                                return (
                                  <div key={doc.key} className="glass" style={{ padding: 10, fontSize: '0.82rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{doc.label}</div>
                                    {val ? (
                                      typeof val === 'string' && val.startsWith('http') ? (
                                        <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)', wordBreak: 'break-all' }}>
                                          <i className="fas fa-external-link-alt"></i> View document
                                        </a>
                                      ) : (
                                        <span style={{ color: 'var(--color-pb-text-secondary)' }}>{String(val)}</span>
                                      )
                                    ) : (
                                      <span style={{ color: 'var(--color-pb-text-muted)' }}>Not provided</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {reviewingKyc.entityType === 'representative' && (
                          <div style={{ marginBottom: 20 }}>
                            <h4 style={{ fontWeight: 700, margin: '0 0 10px', fontSize: '0.95rem' }}>Representative KYC Documents</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {[
                                { label: 'Aadhaar Card', key: 'aadhaar' },
                                { label: 'PAN Card', key: 'pan' },
                                { label: 'ID Proof', key: 'idProof' },
                                { label: 'Address Proof', key: 'addressProof' },
                              ].map(doc => {
                                const kycData = reviewingKyc.kycData && typeof reviewingKyc.kycData === 'object' ? reviewingKyc.kycData : {};
                                const documents = kycData.documents || {};
                                const val = documents[doc.key] || kycData[doc.key];
                                return (
                                  <div key={doc.key} className="glass" style={{ padding: 10, fontSize: '0.82rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{doc.label}</div>
                                    {val ? (
                                      typeof val === 'string' && val.startsWith('http') ? (
                                        <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)', wordBreak: 'break-all' }}>
                                          <i className="fas fa-external-link-alt"></i> View document
                                        </a>
                                      ) : (
                                        <span style={{ color: 'var(--color-pb-text-secondary)' }}>{String(val)}</span>
                                      )
                                    ) : (
                                      <span style={{ color: 'var(--color-pb-text-muted)' }}>Not provided</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div style={{ marginBottom: 16 }}>
                          <label className="pb-label">Reason (required for Reject / Request Reupload)</label>
                          <textarea className="pb-textarea" placeholder="Enter reason if rejecting or requesting reupload…" value={kycActionReason} onChange={e => setKycActionReason(e.target.value)} rows={3} />
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                          <button className="btn" style={{ background: '#22c55e', color: '#fff', flex: 1 }} onClick={() => handleKycAction(reviewingKyc, 'approve')}>
                            <i className="fas fa-check"></i> Approve
                          </button>
                          <button className="btn" style={{ background: '#ef4444', color: '#fff', flex: 1 }} onClick={() => handleKycAction(reviewingKyc, 'reject')}>
                            <i className="fas fa-times"></i> Reject
                          </button>
                          <button className="btn" style={{ background: '#eab308', color: '#fff', flex: 1 }} onClick={() => handleKycAction(reviewingKyc, 'request_reupload')}>
                            <i className="fas fa-upload"></i> Request Reupload
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="glass" style={{ padding: 24 }}>
                  {kycSubmissions.length === 0 ? (
                    <p style={{ color: 'var(--color-pb-text-muted)' }}>No pending KYC submissions.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="pb-table">
                        <thead><tr><th>Entity Name</th><th>Type</th><th>PRN / ID</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
                        <tbody>
                          {kycSubmissions.map((s, i) => (
                            <tr key={s.id || i}>
                              <td style={{ fontWeight: 600 }}>{s.name || '—'}</td>
                              <td><span className={`badge ${typeColors[s.entityType] || 'badge-green'}`}>{s.entityLabel || s.entityType}</span></td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.prn || s.riderId || '—'}</td>
                              <td><span className={`badge ${s.status === 'active' ? 'badge-green' : s.status === 'pending' || s.status === 'kyc_submitted' ? 'badge-gold' : 'badge-red'}`}>{s.status}</span></td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
                              <td>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setReviewingKyc(s); setKycActionReason(''); }}>
                                  <i className="fas fa-eye"></i> Review
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ONBOARDING TAB */}
            {tab === 'onboarding' && (
              <div>
                {selectedOnboarding && (
                  <div className="modal-overlay" onClick={() => setSelectedOnboarding(null)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                      <div className="modal-header">
                        <h3>Onboarding — {selectedOnboarding.name}</h3>
                        <button className="btn btn-ghost btn-icon" onClick={() => setSelectedOnboarding(null)}><i className="fas fa-xmark"></i></button>
                      </div>
                      <div className="modal-body">
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: 'flex', gap: 0, alignItems: 'center', marginBottom: 16 }}>
                            {[
                              { label: 'KYC Approved', done: !!selectedOnboarding.kycApproved },
                              { label: 'Agreement Initiated', done: !!selectedOnboarding.agreementPending || !!selectedOnboarding.agreementSigned || !!selectedOnboarding.onboarded },
                              { label: 'Agreement Signed', done: !!selectedOnboarding.agreementSigned || !!selectedOnboarding.onboarded },
                              { label: 'Fully Onboarded', done: !!selectedOnboarding.onboarded },
                            ].map((step, idx) => (
                              <div key={idx} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.done ? '#22c55e' : 'var(--color-pb-border)', color: step.done ? '#fff' : 'var(--color-pb-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: '0.7rem', fontWeight: 700 }}>
                                  {step.done ? <i className="fas fa-check"></i> : idx + 1}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: step.done ? 'var(--color-pb-text)' : 'var(--color-pb-text-muted)' }}>{step.label}</div>
                                {idx < 3 && <div style={{ position: 'absolute', top: 13, right: -20, width: 40, height: 2, background: step.done ? '#22c55e' : 'var(--color-pb-border)' }}></div>}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, fontSize: '0.85rem' }}>
                          <div><label className="pb-label">Current Status</label><span className={`badge ${selectedOnboarding.onboarded ? 'badge-green' : 'badge-gold'}`}>{selectedOnboarding.currentStatus}</span></div>
                          <div><label className="pb-label">Entity Type</label><span className="badge badge-blue">{selectedOnboarding.entityType}</span></div>
                          <div><label className="pb-label">Email</label>{selectedOnboarding.email || '—'}</div>
                          <div><label className="pb-label">Registered</label>{selectedOnboarding.registeredAt ? new Date(selectedOnboarding.registeredAt).toLocaleDateString() : '—'}</div>
                          {selectedOnboarding.kycApproved && <div><label className="pb-label">KYC Approved</label>{new Date(selectedOnboarding.kycApproved).toLocaleDateString()}</div>}
                          {selectedOnboarding.agreementSigned && <div><label className="pb-label">Signed</label>{new Date(selectedOnboarding.agreementSigned).toLocaleDateString()}</div>}
                          {selectedOnboarding.onboarded && <div><label className="pb-label">Onboarded</label>{new Date(selectedOnboarding.onboarded).toLocaleDateString()}</div>}
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {!selectedOnboarding.agreementPending && !selectedOnboarding.agreementSigned && !selectedOnboarding.onboarded && selectedOnboarding.kycApproved && (
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleOnboardingAction(selectedOnboarding, 'initiate_agreement')}>
                              <i className="fas fa-file-signature"></i> Initiate Agreement
                            </button>
                          )}
                          {selectedOnboarding.agreementPending && !selectedOnboarding.agreementSigned && (
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleOnboardingAction(selectedOnboarding, 'sign_agreement')}>
                              <i className="fas fa-pen-fancy"></i> Mark as Signed
                            </button>
                          )}
                          {selectedOnboarding.agreementSigned && !selectedOnboarding.onboarded && (
                            <button className="btn btn-primary" style={{ flex: 1, background: '#22c55e' }} onClick={() => handleOnboardingAction(selectedOnboarding, 'complete_onboarding')}>
                              <i className="fas fa-check-circle"></i> Complete Onboarding
                            </button>
                          )}
                          {selectedOnboarding.onboarded && (
                            <div style={{ padding: 12, textAlign: 'center', color: '#22c55e', fontWeight: 600, width: '100%' }}>
                              <i className="fas fa-check-circle"></i> Fully Onboarded
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="glass" style={{ padding: 24 }}>
                  {onboardingLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--color-pb-primary)' }}></i></div>
                  ) : onboardingEntities.length === 0 ? (
                    <p style={{ color: 'var(--color-pb-text-muted)' }}>No entities found for onboarding.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="pb-table">
                        <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>KYC</th><th>Agreement</th><th>Signed</th><th>Onboarded</th><th>Actions</th></tr></thead>
                        <tbody>
                          {onboardingEntities.map((e, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{e.name || '—'}</td>
                              <td><span className={`badge ${typeColors[e.entityType] || 'badge-green'}`}>{e.entityType}</span></td>
                              <td><span className={`badge ${e.currentStatus === 'active' ? 'badge-green' : 'badge-gold'}`}>{e.currentStatus}</span></td>
                              <td>{e.kycApproved ? <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> : <i className="fas fa-times-circle" style={{ color: 'var(--color-pb-text-muted)' }}></i>}</td>
                              <td>{e.agreementPending || e.agreementSigned ? <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> : <i className="fas fa-times-circle" style={{ color: 'var(--color-pb-text-muted)' }}></i>}</td>
                              <td>{e.agreementSigned ? <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> : <i className="fas fa-times-circle" style={{ color: 'var(--color-pb-text-muted)' }}></i>}</td>
                              <td>{e.onboarded ? <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> : <i className="fas fa-times-circle" style={{ color: 'var(--color-pb-text-muted)' }}></i>}</td>
                              <td>
                                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOnboarding(e)}>
                                  <i className="fas fa-arrow-right"></i> Manage
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STORIES TAB */}
            {tab === 'stories' && (
              <div>
                {editingStory !== null && (
                  <div className="modal-overlay" onClick={() => setEditingStory(null)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>{editingStory?.id ? 'Edit' : 'New'} Story</h3><button className="btn btn-ghost btn-icon" onClick={() => setEditingStory(null)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={saveStory} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Title</label><input className="pb-input" name="title" defaultValue={editingStory?.title || ''} required /></div>
                          <div><label className="pb-label">Location</label><input className="pb-input" name="location" defaultValue={editingStory?.location || ''} /></div>
                          <div><label className="pb-label">Category</label><input className="pb-input" name="category" defaultValue={editingStory?.category || ''} /></div>
                          <div><label className="pb-label">Description</label><textarea className="pb-textarea" name="description" defaultValue={editingStory?.description || ''} /></div>
                          <div><label className="pb-label">Image URL</label><input className="pb-input" name="imageUrl" defaultValue={editingStory?.imageUrl || ''} /></div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-check"></i> Save</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
                <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setEditingStory({})}><i className="fas fa-plus"></i> New story</button>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {stories.map(s => (
                    <div key={s.id} className="glass" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="badge badge-green">{s.category || 'Story'}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingStory(s)}><i className="fas fa-pen"></i></button>
                      </div>
                      <h4 style={{ margin: '12px 0 8px', fontWeight: 700 }}>{s.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)' }}>{s.description?.slice(0, 100)}…</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REVIEWS TAB */}
            {tab === 'reviews' && (
              <div>
                {editingReview !== null && (
                  <div className="modal-overlay" onClick={() => setEditingReview(null)}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>{editingReview?.id ? 'Edit' : 'New'} Review</h3><button className="btn btn-ghost btn-icon" onClick={() => setEditingReview(null)}><i className="fas fa-xmark"></i></button></div>
                      <div className="modal-body">
                        <form onSubmit={saveReview} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div><label className="pb-label">Name</label><input className="pb-input" name="name" defaultValue={editingReview?.name || ''} required /></div>
                          <div><label className="pb-label">Role</label><input className="pb-input" name="role" defaultValue={editingReview?.role || ''} /></div>
                          <div><label className="pb-label">Location</label><input className="pb-input" name="location" defaultValue={editingReview?.location || ''} /></div>
                          <div><label className="pb-label">Quote</label><textarea className="pb-textarea" name="quote" defaultValue={editingReview?.quote || ''} required /></div>
                          <div><label className="pb-label">Rating (1-5)</label><input className="pb-input" name="rating" type="number" min="1" max="5" defaultValue={editingReview?.rating || 5} /></div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-check"></i> Save</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
                <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setEditingReview({})}><i className="fas fa-plus"></i> New review</button>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {reviews.map(r => (
                    <div key={r.id} className="glass" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 2, color: 'var(--color-pb-accent)' }}>
                          {Array.from({ length: r.rating || 5 }).map((_, i) => <i key={i} className="fas fa-star" style={{ fontSize: '0.7rem' }}></i>)}
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingReview(r)}><i className="fas fa-pen"></i></button>
                      </div>
                      <p style={{ margin: '12px 0', fontStyle: 'italic', fontSize: '0.88rem' }}>&ldquo;{r.quote}&rdquo;</p>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{r.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CMS TAB */}
            {tab === 'cms' && (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { key: 'news', label: 'News', icon: 'fa-newspaper' },
                    { key: 'announcements', label: 'Announcements', icon: 'fa-bullhorn' },
                    { key: 'banners', label: 'Banners', icon: 'fa-image' },
                    { key: 'maintenance', label: 'Maintenance', icon: 'fa-wrench' },
                  ].map(st => (
                    <button key={st.key} className={`btn ${cmsTab === st.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCmsTab(st.key)}>
                      <i className={`fas ${st.icon}`}></i> {st.label}
                    </button>
                  ))}
                </div>

                {/* CMS Modals */}
                {showCmsModal && editingCmsItem && (
                  <div className="modal-overlay" onClick={() => { setShowCmsModal(false); setEditingCmsItem(null); }}>
                    <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>{editingCmsItem.isNew ? 'New' : 'Edit'} {editingCmsItem.collectionKey?.replace('_', ' ')}</h3>
                        <button className="btn btn-ghost btn-icon" onClick={() => { setShowCmsModal(false); setEditingCmsItem(null); }}><i className="fas fa-xmark"></i></button>
                      </div>
                      <div className="modal-body">
                        <form onSubmit={saveCmsModalItem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {editingCmsItem.collectionKey === 'news_items' && (
                            <>
                              <div><label className="pb-label">Title</label><input className="pb-input" name="title" defaultValue={editingCmsItem.title || ''} required /></div>
                              <div><label className="pb-label">Content</label><textarea className="pb-textarea" name="content" defaultValue={editingCmsItem.content || ''} rows={4} /></div>
                              <div><label className="pb-label">Publish Date</label><input className="pb-input" name="publishDate" type="date" defaultValue={editingCmsItem.publishDate || ''} /></div>
                              <div><label className="pb-label">Active</label>
                                <select className="pb-select" name="isActive" defaultValue={editingCmsItem.isActive !== undefined ? String(editingCmsItem.isActive) : 'true'}>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              </div>
                            </>
                          )}
                          {editingCmsItem.collectionKey === 'announcement_items' && (
                            <>
                              <div><label className="pb-label">Title</label><input className="pb-input" name="title" defaultValue={editingCmsItem.title || ''} required /></div>
                              <div><label className="pb-label">Message</label><textarea className="pb-textarea" name="message" defaultValue={editingCmsItem.message || ''} rows={3} /></div>
                              <div><label className="pb-label">Priority</label>
                                <select className="pb-select" name="priority" defaultValue={editingCmsItem.priority || 'medium'}>
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                              </div>
                              <div><label className="pb-label">Active</label>
                                <select className="pb-select" name="isActive" defaultValue={editingCmsItem.isActive !== undefined ? String(editingCmsItem.isActive) : 'true'}>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              </div>
                              <div><label className="pb-label">Expires At</label><input className="pb-input" name="expiresAt" type="datetime-local" defaultValue={editingCmsItem.expiresAt || ''} /></div>
                            </>
                          )}
                          {editingCmsItem.collectionKey === 'banner_items' && (
                            <>
                              <div><label className="pb-label">Title</label><input className="pb-input" name="title" defaultValue={editingCmsItem.title || ''} required /></div>
                              <div><label className="pb-label">Image URL</label><input className="pb-input" name="imageUrl" defaultValue={editingCmsItem.imageUrl || ''} /></div>
                              <div><label className="pb-label">Link URL</label><input className="pb-input" name="linkUrl" defaultValue={editingCmsItem.linkUrl || ''} /></div>
                              <div><label className="pb-label">Position</label>
                                <select className="pb-select" name="position" defaultValue={editingCmsItem.position || 'hero'}>
                                  <option value="hero">Hero</option>
                                  <option value="sidebar">Sidebar</option>
                                  <option value="footer">Footer</option>
                                </select>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div><label className="pb-label">Sort Order</label><input className="pb-input" name="sortOrder" type="number" defaultValue={editingCmsItem.sortOrder || 0} /></div>
                                <div><label className="pb-label">Active</label>
                                  <select className="pb-select" name="isActive" defaultValue={editingCmsItem.isActive !== undefined ? String(editingCmsItem.isActive) : 'true'}>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                </div>
                              </div>
                            </>
                          )}
                          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-check"></i> Save</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* News Sub-tab */}
                {cmsTab === 'news' && (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <button className="btn btn-primary" onClick={() => openCmsCreateModal('news_items')}><i className="fas fa-plus"></i> New Article</button>
                    </div>
                    {(() => { const items = getCmsItems('news_items'); return items.length === 0 ? (
                      <p style={{ color: 'var(--color-pb-text-muted)' }}>No news articles.</p>
                    ) : (
                      <div className="glass" style={{ padding: 24 }}>
                        <table className="pb-table">
                          <thead><tr><th>Title</th><th>Publish Date</th><th>Active</th><th>Actions</th></tr></thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.id}>
                                <td style={{ fontWeight: 600 }}>{item.title || '—'}</td>
                                <td style={{ fontSize: '0.85rem' }}>{item.publishDate || '—'}</td>
                                <td><span className={`badge ${item.isActive ? 'badge-green' : 'badge-red'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openCmsEditModal('news_items', item)}><i className="fas fa-pen"></i></button>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-pb-danger)' }} onClick={() => deleteCmsItem('news_items', item.id)}><i className="fas fa-trash"></i></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ); })()}
                  </div>
                )}

                {/* Announcements Sub-tab */}
                {cmsTab === 'announcements' && (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <button className="btn btn-primary" onClick={() => openCmsCreateModal('announcement_items')}><i className="fas fa-plus"></i> New Announcement</button>
                    </div>
                    {(() => { const items = getCmsItems('announcement_items'); return items.length === 0 ? (
                      <p style={{ color: 'var(--color-pb-text-muted)' }}>No announcements.</p>
                    ) : (
                      <div className="glass" style={{ padding: 24 }}>
                        <table className="pb-table">
                          <thead><tr><th>Title</th><th>Priority</th><th>Active</th><th>Expires</th><th>Actions</th></tr></thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.id}>
                                <td style={{ fontWeight: 600 }}>{item.title || '—'}</td>
                                <td><span className={`badge ${item.priority === 'high' ? 'badge-red' : item.priority === 'medium' ? 'badge-gold' : 'badge-green'}`}>{item.priority || 'medium'}</span></td>
                                <td><span className={`badge ${item.isActive ? 'badge-green' : 'badge-red'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '—'}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openCmsEditModal('announcement_items', item)}><i className="fas fa-pen"></i></button>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-pb-danger)' }} onClick={() => deleteCmsItem('announcement_items', item.id)}><i className="fas fa-trash"></i></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ); })()}
                  </div>
                )}

                {/* Banners Sub-tab */}
                {cmsTab === 'banners' && (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <button className="btn btn-primary" onClick={() => openCmsCreateModal('banner_items')}><i className="fas fa-plus"></i> New Banner</button>
                    </div>
                    {(() => { const items = getCmsItems('banner_items'); return items.length === 0 ? (
                      <p style={{ color: 'var(--color-pb-text-muted)' }}>No banners.</p>
                    ) : (
                      <div className="glass" style={{ padding: 24 }}>
                        <table className="pb-table">
                          <thead><tr><th>Title</th><th>Position</th><th>Sort</th><th>Active</th><th>Actions</th></tr></thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.id}>
                                <td style={{ fontWeight: 600 }}>{item.title || '—'}</td>
                                <td><span className="badge badge-blue">{item.position || 'hero'}</span></td>
                                <td>{item.sortOrder || 0}</td>
                                <td><span className={`badge ${item.isActive ? 'badge-green' : 'badge-red'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openCmsEditModal('banner_items', item)}><i className="fas fa-pen"></i></button>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-pb-danger)' }} onClick={() => deleteCmsItem('banner_items', item.id)}><i className="fas fa-trash"></i></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ); })()}
                  </div>
                )}

                {/* Maintenance Sub-tab */}
                {cmsTab === 'maintenance' && (
                  <div className="glass" style={{ padding: 28 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 20px' }}>Maintenance Mode</h3>
                    <form onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.target); saveCmsSetting('maintenance_mode', form.get('maintenance_mode') === 'on'); saveCmsSetting('maintenance_message', form.get('maintenance_message')); saveCmsSetting('schedule_start', form.get('schedule_start')); saveCmsSetting('schedule_end', form.get('schedule_end')); }} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
                      <div>
                        <label className="pb-label">Maintenance Mode</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 6 }}>
                          <input type="checkbox" name="maintenance_mode" defaultChecked={cmsData.maintenance_mode === true || cmsData.maintenance_mode === 'true'} style={{ width: 18, height: 18, accentColor: 'var(--color-pb-primary)' }} />
                          <span style={{ fontSize: '0.88rem' }}>Enable maintenance mode</span>
                        </label>
                      </div>
                      <div>
                        <label className="pb-label">Maintenance Message</label>
                        <textarea className="pb-textarea" name="maintenance_message" defaultValue={cmsData.maintenance_message || 'We are currently performing scheduled maintenance. Please check back later.'} rows={3} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label className="pb-label">Schedule Start</label><input className="pb-input" name="schedule_start" type="datetime-local" defaultValue={cmsData.schedule_start || ''} /></div>
                        <div><label className="pb-label">Schedule End</label><input className="pb-input" name="schedule_end" type="datetime-local" defaultValue={cmsData.schedule_end || ''} /></div>
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><i className="fas fa-save"></i> Save Maintenance Settings</button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* SITE CONFIG TAB */}
            {tab === 'settings' && (
              <div className="glass" style={{ padding: 28 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 20px' }}>Site Configuration</h3>
                <form onSubmit={saveSiteConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
                  <div><label className="pb-label">Hero Title</label><input className="pb-input" name="hero_title" defaultValue={siteConfig.hero_title || ''} /></div>
                  <div><label className="pb-label">Hero Subtitle</label><textarea className="pb-textarea" name="hero_subtitle" defaultValue={siteConfig.hero_subtitle || ''} /></div>
                  <div>
                    <label className="pb-label">Logo</label>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 8 }}>
                          <input className="pb-input" name="logo_url" defaultValue={siteConfig.logo_url || ''} placeholder="Or paste image URL" onChange={e => setLogoPreview(e.target.value)} style={{ marginBottom: 8 }} />
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginTop: 4 }}>Paste a URL or upload a file below</div>
                        </div>
                        <div>
                          <input type="file" accept="image/*" onChange={handleLogoFileSelect} style={{ fontSize: '0.85rem' }} />
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginTop: 4 }}>Upload an image (converted to base64)</div>
                        </div>
                      </div>
                      {logoPreview && (
                        <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--color-pb-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-pb-bg)' }}>
                          <img src={logoPreview} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div><label className="pb-label">Banner URL</label><input className="pb-input" name="banner_url" defaultValue={siteConfig.banner_url || ''} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label className="pb-label">Rescues Override</label><input className="pb-input" name="stat_rescues_override" type="number" defaultValue={siteConfig.stat_rescues_override || ''} /></div>
                    <div><label className="pb-label">NGOs Override</label><input className="pb-input" name="stat_ngos_override" type="number" defaultValue={siteConfig.stat_ngos_override || ''} /></div>
                    <div><label className="pb-label">Doctors Override</label><input className="pb-input" name="stat_doctors_override" type="number" defaultValue={siteConfig.stat_doctors_override || ''} /></div>
                    <div><label className="pb-label">Riders Override</label><input className="pb-input" name="stat_riders_override" type="number" defaultValue={siteConfig.stat_riders_override || ''} /></div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><i className="fas fa-save"></i> Save configuration</button>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
