'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      } else if (t === 'stories') {
        const [st, sc] = await Promise.all([adminFetch('/api/admin/stories').then(r => r.json()), adminFetch('/api/admin/site-config').then(r => r.json())]);
        setStories(Array.isArray(st) ? st : []); setSiteConfig(sc || {});
      } else if (t === 'reviews') {
        const [rv, sc] = await Promise.all([adminFetch('/api/admin/reviews').then(r => r.json()), adminFetch('/api/admin/site-config').then(r => r.json())]);
        setReviews(Array.isArray(rv) ? rv : []); setSiteConfig(sc || {});
      } else if (t === 'settings') {
        const sc = await adminFetch('/api/admin/site-config').then(r => r.json());
        setSiteConfig(sc || {});
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
    { key: 'stories', icon: 'fa-book-open', label: 'Stories' },
    { key: 'reviews', icon: 'fa-star', label: 'Reviews' },
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

  const [editingReview, setEditingReview] = useState(null);

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
                <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <input className="pb-input" placeholder="Search by name, email, or type…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ maxWidth: 400 }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', alignSelf: 'center' }}>{filteredAccounts.length} accounts</span>
                </div>
                <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pb-table">
                      <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Status</th><th>Joined</th></tr></thead>
                      <tbody>
                        {filteredAccounts.map((a, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{a._label}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)' }}>{a.email || '—'}</td>
                            <td><span className={`badge ${typeColors[a._type] || 'badge-green'}`}>{a._type}</span></td>
                            <td><span className={`badge ${a.status === 'active' ? 'badge-green' : a.status === 'pending' ? 'badge-gold' : 'badge-red'}`}>{a.status || '—'}</span></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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

            {/* SETTINGS TAB */}
            {tab === 'settings' && (
              <div className="glass" style={{ padding: 28 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 20px' }}>Site Configuration</h3>
                <form onSubmit={saveSiteConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
                  <div><label className="pb-label">Hero Title</label><input className="pb-input" name="hero_title" defaultValue={siteConfig.hero_title || ''} /></div>
                  <div><label className="pb-label">Hero Subtitle</label><textarea className="pb-textarea" name="hero_subtitle" defaultValue={siteConfig.hero_subtitle || ''} /></div>
                  <div><label className="pb-label">Logo URL</label><input className="pb-input" name="logo_url" defaultValue={siteConfig.logo_url || ''} /></div>
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
