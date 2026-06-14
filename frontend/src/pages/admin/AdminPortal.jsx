import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  adminFetchJson,
  clearSession,
  getProfile,
  verifySession
} from '../../lib/adminAuth';
import '../../styles/shared-case-form.css';
import '../../styles/paw-case-hub.css';

const TABS = [
  { id: 'dash', label: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'verify', label: 'Verification', icon: 'fa-user-check' },
  { id: 'customers', label: 'Customers', icon: 'fa-users' },
  { id: 'cases', label: 'Cases', icon: 'fa-truck-medical' },
  { id: 'cms', label: 'Website editor', icon: 'fa-globe' }
];

export default function AdminPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('dash');
  const [stats, setStats] = useState({});
  const [pending, setPending] = useState({ ngos: [], doctors: [], riders: [], representatives: [] });
  const [customers, setCustomers] = useState([]);
  const [cases, setCases] = useState([]);
  const [siteConfig, setSiteConfig] = useState({});
  const [stories, setStories] = useState([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifySession().then((ok) => {
      if (!ok) navigate('/admin/login');
      else setLoading(false);
    });
  }, [navigate]);

  useEffect(() => {
    if (loading) return;
    if (tab === 'dash') refreshDash();
    if (tab === 'verify') loadPending();
    if (tab === 'customers') loadCustomers();
    if (tab === 'cases') loadCases();
    if (tab === 'cms') loadCms();
  }, [tab, loading]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  async function refreshDash() {
    try {
      const s = await adminFetchJson('/api/stats');
      setStats(s);
      const p = await adminFetchJson('/api/admin/pending-applications');
      setPending(p);
    } catch (e) { showToast(e.message); }
  }

  async function loadPending() {
    try {
      setPending(await adminFetchJson('/api/admin/pending-applications'));
    } catch (e) { showToast(e.message); }
  }

  async function loadCustomers() {
    try {
      setCustomers(await adminFetchJson('/api/admin/customers'));
    } catch (e) { showToast(e.message); }
  }

  async function loadCases() {
    try {
      setCases(await adminFetchJson('/api/admin/cases'));
    } catch (e) { showToast(e.message); }
  }

  async function loadCms() {
    try {
      const [config, storyList] = await Promise.all([
        adminFetchJson('/api/site-config'),
        adminFetchJson('/api/stories')
      ]);
      setSiteConfig(config);
      setStories(Array.isArray(storyList) ? storyList : []);
    } catch (e) { showToast(e.message); }
  }

  async function approveEntity(type, item) {
    try {
      await adminFetchJson('/api/admin/approve-application', {
        method: 'POST',
        body: JSON.stringify({ type, id: item.id, uid: item.uid })
      });
      showToast('Approved');
      loadPending();
    } catch (e) { showToast(e.message); }
  }

  async function saveSiteConfig(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    try {
      await adminFetchJson('/api/admin/site-config', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Website updated');
    } catch (err) { showToast(err.message); }
  }

  function logout() {
    clearSession();
    navigate('/admin/login');
  }

  if (loading) {
    return <div className="ap-admin" style={{ padding: 40 }}><i className="fas fa-spinner fa-spin" /> Loading…</div>;
  }

  const profile = getProfile();
  const pendingCount =
    (pending.ngos?.length || 0) + (pending.doctors?.length || 0) +
    (pending.representatives?.length || 0) + (pending.riders?.length || 0);

  return (
    <div className="ap-admin">
      <aside className="ap-sidebar">
        <Link to="/" className="ap-brand">
          <div className="ap-brand-icon"><i className="fas fa-paw" /></div>
          <div><h1>PawBandhan</h1><span>Admin command center</span></div>
        </Link>
        <ul className="ap-nav">
          {TABS.map((t) => (
            <li key={t.id}>
              <button type="button" className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                <i className={`fas ${t.icon}`} /> {t.label}
                {t.id === 'verify' && pendingCount > 0 ? <span className="ap-nav-badge">{pendingCount}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <div className="ap-sidebar-foot">
          <p className="ap-user-email">{profile?.email || 'Admin'}</p>
          <button type="button" className="ap-btn-signout" onClick={logout}><i className="fas fa-right-from-bracket" /> Sign out</button>
        </div>
      </aside>

      <main className="ap-main">
        {toast ? <div className="ap-toast show ok">{toast}</div> : null}

        {tab === 'dash' ? (
          <>
            <header className="ap-header"><div><h2>Dashboard</h2><p>Live counts from your database.</p></div></header>
            <div className="ap-stats">
              <div className="ap-stat"><span className="label">Rescues</span><span className="val">{Number(stats.totalRescues || 0).toLocaleString('en-IN')}</span></div>
              <div className="ap-stat"><span className="label">NGOs</span><span className="val">{Number(stats.totalNGOs || 0).toLocaleString('en-IN')}</span></div>
              <div className="ap-stat"><span className="label">Riders</span><span className="val">{Number(stats.totalRiders || 0).toLocaleString('en-IN')}</span></div>
              <div className="ap-stat"><span className="label">Vets</span><span className="val">{Number(stats.totalDoctors || 0).toLocaleString('en-IN')}</span></div>
            </div>
          </>
        ) : null}

        {tab === 'verify' ? (
          <>
            <header className="ap-header"><h2>Pending verifications</h2></header>
            {['ngos', 'doctors', 'representatives'].map((key) => (
              <div key={key} className="ap-card" style={{ marginBottom: 16 }}>
                <h3>{key}</h3>
                {(pending[key] || []).length ? (pending[key] || []).map((item) => (
                  <div key={item.id} className="ap-queue-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--ap-border)' }}>
                    <span>{item.name || item.email}</span>
                    <button type="button" className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => approveEntity(key === 'representatives' ? 'representative' : key.slice(0, -1), item)}>Approve</button>
                  </div>
                )) : <p style={{ color: 'var(--ap-muted)' }}>None pending</p>}
              </div>
            ))}
          </>
        ) : null}

        {tab === 'customers' ? (
          <>
            <header className="ap-header"><h2>Customers</h2></header>
            <div className="ap-card">
              <table className="ap-table" style={{ width: '100%' }}>
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id || c.uid}>
                      <td>{c.name}</td>
                      <td>{c.user_email || c.email}</td>
                      <td>{c.user_phone || c.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {tab === 'cases' ? (
          <>
            <header className="ap-header"><h2>Cases</h2></header>
            <div className="ap-card">
              {cases.length ? cases.map((c) => (
                <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--ap-border)' }}>
                  <strong>{c.animal_type || 'Case'}</strong> — {c.status} — {c.location || '—'}
                </div>
              )) : <p>No cases yet</p>}
            </div>
          </>
        ) : null}

        {tab === 'cms' ? (
          <>
            <header className="ap-header"><h2>Website editor</h2></header>
            <form className="ap-card" onSubmit={saveSiteConfig}>
              {['hero_title', 'hero_subtitle', 'hero_badge', 'emergency_hotline', 'stories_section_title', 'stories_section_lead'].map((key) => (
                <div key={key} className="admin-field" style={{ marginBottom: 16 }}>
                  <label htmlFor={key}>{key.replace(/_/g, ' ')}</label>
                  <input id={key} name={key} defaultValue={siteConfig[key] || ''} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                </div>
              ))}
              <button type="submit" className="ap-btn ap-btn-primary">Save website</button>
            </form>
            <div className="ap-card" style={{ marginTop: 16 }}>
              <h3>Success stories ({stories.length})</h3>
              <p style={{ color: 'var(--ap-muted)', fontSize: '0.9rem' }}>Manage stories via API or legacy admin tools.</p>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
