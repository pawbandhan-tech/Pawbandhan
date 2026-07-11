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
  { id: 'cms', label: 'Website Editor', icon: 'fa-globe' }
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

  // For the active section within the CMS editor
  const [cmsSection, setCmsSection] = useState('theme');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      showToast('Website updated successfully!');
      // Reload CMS config
      loadCms();
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
                <h3 style={{ textTransform: 'capitalize', marginBottom: 12 }}>{key}</h3>
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
            <header className="ap-header">
              <div>
                <h2>Website Editor</h2>
                <p>Completely dynamic tools to manage theme styling, alert banners, and interactive landing features.</p>
              </div>
            </header>

            <div className="ap-cms-container" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
              <nav className="ap-cms-nav" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--ap-card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--ap-border)' }}>
                <button type="button" className={`ap-btn ${cmsSection === 'theme' ? 'ap-btn-primary' : 'ap-btn-ghost'}`} onClick={() => setCmsSection('theme')} style={{ justifyContent: 'flex-start', padding: '10px 14px' }}>
                  <i className="fas fa-palette" style={{ marginRight: 8 }} /> Themes & Style
                </button>
                <button type="button" className={`ap-btn ${cmsSection === 'banner' ? 'ap-btn-primary' : 'ap-btn-ghost'}`} onClick={() => setCmsSection('banner')} style={{ justifyContent: 'flex-start', padding: '10px 14px' }}>
                  <i className="fas fa-bullhorn" style={{ marginRight: 8 }} /> Alert Banner
                </button>
                <button type="button" className={`ap-btn ${cmsSection === 'hero' ? 'ap-btn-primary' : 'ap-btn-ghost'}`} onClick={() => setCmsSection('hero')} style={{ justifyContent: 'flex-start', padding: '10px 14px' }}>
                  <i className="fas fa-heading" style={{ marginRight: 8 }} /> Hero & CTAs
                </button>
                <button type="button" className={`ap-btn ${cmsSection === 'services' ? 'ap-btn-primary' : 'ap-btn-ghost'}`} onClick={() => setCmsSection('services')} style={{ justifyContent: 'flex-start', padding: '10px 14px' }}>
                  <i className="fas fa-server" style={{ marginRight: 8 }} /> Services Blocks
                </button>
                <button type="button" className={`ap-btn ${cmsSection === 'spotlight' ? 'ap-btn-primary' : 'ap-btn-ghost'}`} onClick={() => setCmsSection('spotlight')} style={{ justifyContent: 'flex-start', padding: '10px 14px' }}>
                  <i className="fas fa-quote-left" style={{ marginRight: 8 }} /> Citizen Spotlight
                </button>
              </nav>

              <form className="ap-card" onSubmit={saveSiteConfig} style={{ margin: 0, padding: '24px' }}>
                {cmsSection === 'theme' && (
                  <div className="cms-group">
                    <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--ap-border)', paddingBottom: '8px' }}>Themes & Accent Style</h3>
                    <div className="admin-field" style={{ marginBottom: '20px' }}>
                      <label htmlFor="site_accent_theme" style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Accent Accent Color Preset</label>
                      <select id="site_accent_theme" name="site_accent_theme" defaultValue={siteConfig.site_accent_theme || 'midnight'} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }}>
                        <option value="midnight">Midnight Aurora (Indigo / Teal Accent)</option>
                        <option value="emerald">Emerald Sanctuary (Forest Green / Gold Accent)</option>
                        <option value="amber">Sunset Amber (Autumn gold / Sunset Rose Accent)</option>
                        <option value="coral">Velvet Coral (Rose Coral / Psychedelic Purple Accent)</option>
                      </select>
                    </div>
                  </div>
                )}

                {cmsSection === 'banner' && (
                  <div className="cms-group">
                    <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--ap-border)', paddingBottom: '8px' }}>Global Alert Banner</h3>
                    <div className="admin-field" style={{ marginBottom: '20px' }}>
                      <label htmlFor="banner_active" style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Banner Display Status</label>
                      <select id="banner_active" name="banner_active" defaultValue={siteConfig.banner_active || 'false'} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }}>
                        <option value="true">Active (Show at top of page)</option>
                        <option value="false">Inactive (Hide)</option>
                      </select>
                    </div>
                    <div className="admin-field" style={{ marginBottom: '20px' }}>
                      <label htmlFor="banner_style" style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Banner Style Accent</label>
                      <select id="banner_style" name="banner_style" defaultValue={siteConfig.banner_style || 'teal'} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }}>
                        <option value="teal">Success Teal</option>
                        <option value="warning">Amber Caution</option>
                        <option value="danger">Emergency Hot Red</option>
                      </select>
                    </div>
                    <div className="admin-field" style={{ marginBottom: '20px' }}>
                      <label htmlFor="banner_badge" style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Banner Mini Tag</label>
                      <input id="banner_badge" name="banner_badge" defaultValue={siteConfig.banner_badge || 'Notice'} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                    </div>
                    <div className="admin-field" style={{ marginBottom: '20px' }}>
                      <label htmlFor="banner_text" style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Announcement Body Message</label>
                      <input id="banner_text" name="banner_text" defaultValue={siteConfig.banner_text || 'Emergency rescue operations are live and active across key cities.'} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                    </div>
                  </div>
                )}

                {cmsSection === 'hero' && (
                  <div className="cms-group">
                    <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--ap-border)', paddingBottom: '8px' }}>Hero Section & CTAs</h3>
                    {['hero_badge', 'hero_title', 'hero_subtitle', 'emergency_hotline'].map((key) => (
                      <div key={key} className="admin-field" style={{ marginBottom: '16px' }}>
                        <label htmlFor={key} style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</label>
                        <input id={key} name={key} defaultValue={siteConfig[key] || ''} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                      </div>
                    ))}
                    <div className="admin-field" style={{ marginBottom: '16px' }}>
                      <label htmlFor="cta_report_label" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Main Action Button Label</label>
                      <input id="cta_report_label" name="cta_report_label" defaultValue={siteConfig.cta_report_label || 'Report a case'} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                    </div>
                    <div className="admin-field" style={{ marginBottom: '16px' }}>
                      <label htmlFor="cta_partner_label" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Secondary Action Button Label</label>
                      <input id="cta_partner_label" name="cta_partner_label" defaultValue={siteConfig.cta_partner_label || 'Partner with us'} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                    </div>
                  </div>
                )}

                {cmsSection === 'services' && (
                  <div className="cms-group">
                    <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--ap-border)', paddingBottom: '8px' }}>Rescue Services & Interactive Blocks</h3>

                    {/* Service 1 */}
                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', marginBottom: '16px' }}>
                      <h4>Service Card 1</h4>
                      <div className="admin-field" style={{ margin: '8px 0' }}>
                        <label htmlFor="service1_title">Title</label>
                        <input id="service1_title" name="service1_title" defaultValue={siteConfig.service1_title || 'Snap & report'} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                      </div>
                      <div className="admin-field" style={{ margin: '8px 0' }}>
                        <label htmlFor="service1_desc">Description</label>
                        <input id="service1_desc" name="service1_desc" defaultValue={siteConfig.service1_desc || 'Photo, location, and animal details — under a minute.'} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                      </div>
                      <div className="admin-field" style={{ margin: '8px 0' }}>
                        <label htmlFor="service1_icon">FontAwesome Icon Class</label>
                        <input id="service1_icon" name="service1_icon" defaultValue={siteConfig.service1_icon || 'fa-camera'} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                      </div>
                    </div>

                    {/* Service 2 */}
                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', marginBottom: '16px' }}>
                      <h4>Service Card 2</h4>
                      <div className="admin-field" style={{ margin: '8px 0' }}>
                        <label htmlFor="service2_title">Title</label>
                        <input id="service2_title" name="service2_title" defaultValue={siteConfig.service2_title || 'NGO accepts & dispatches'} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                      </div>
                      <div className="admin-field" style={{ margin: '8px 0' }}>
                        <label htmlFor="service2_desc">Description</label>
                        <input id="service2_desc" name="service2_desc" defaultValue={siteConfig.service2_desc || 'Nearest shelter accepts and alerts a verified hero.'} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                      </div>
                      <div className="admin-field" style={{ margin: '8px 0' }}>
                        <label htmlFor="service2_icon">FontAwesome Icon Class</label>
                        <input id="service2_icon" name="service2_icon" defaultValue={siteConfig.service2_icon || 'fa-building-shield'} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                      </div>
                    </div>

                    {/* Service 3 */}
                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', marginBottom: '16px' }}>
                      <h4>Service Card 3</h4>
                      <div className="admin-field" style={{ margin: '8px 0' }}>
                        <label htmlFor="service3_title">Title</label>
                        <input id="service3_title" name="service3_title" defaultValue={siteConfig.service3_title || 'Track recovery live'} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                      </div>
                      <div className="admin-field" style={{ margin: '8px 0' }}>
                        <label htmlFor="service3_desc">Description</label>
                        <input id="service3_desc" name="service3_desc" defaultValue={siteConfig.service3_desc || 'Follow progress through treatment until safe.'} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                      </div>
                      <div className="admin-field" style={{ margin: '8px 0' }}>
                        <label htmlFor="service3_icon">FontAwesome Icon Class</label>
                        <input id="service3_icon" name="service3_icon" defaultValue={siteConfig.service3_icon || 'fa-map-location-dot'} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                      </div>
                    </div>
                  </div>
                )}

                {cmsSection === 'spotlight' && (
                  <div className="cms-group">
                    <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--ap-border)', paddingBottom: '8px' }}>Citizen Spotlight Testimonial</h3>
                    <div className="admin-field" style={{ marginBottom: '16px' }}>
                      <label htmlFor="spotlight_quote" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Highlight Quote</label>
                      <textarea id="spotlight_quote" name="spotlight_quote" defaultValue={siteConfig.spotlight_quote || ''} rows={4} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)', fontFamily: 'inherit' }} />
                    </div>
                    <div className="admin-field" style={{ marginBottom: '16px' }}>
                      <label htmlFor="spotlight_author" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Author Name</label>
                      <input id="spotlight_author" name="spotlight_author" defaultValue={siteConfig.spotlight_author || ''} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                    </div>
                    <div className="admin-field" style={{ marginBottom: '16px' }}>
                      <label htmlFor="spotlight_role" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Author Subtitle / Location</label>
                      <input id="spotlight_role" name="spotlight_role" defaultValue={siteConfig.spotlight_role || ''} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                    </div>
                    <div className="admin-field" style={{ marginBottom: '16px' }}>
                      <label htmlFor="spotlight_photo" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Author Photo URL</label>
                      <input id="spotlight_photo" name="spotlight_photo" defaultValue={siteConfig.spotlight_photo || ''} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--ap-border)', background: 'var(--ap-input-bg)', color: 'var(--ap-text)' }} />
                    </div>
                  </div>
                )}

                <button type="submit" className="ap-btn ap-btn-primary" style={{ marginTop: '24px', width: '100%', padding: '14px' }}>
                  <i className="fas fa-save" style={{ marginRight: 8 }} /> Publish Updates to Website
                </button>
              </form>
            </div>

            <div className="ap-card" style={{ marginTop: 24 }}>
              <h3>Success Stories Management ({stories.length})</h3>
              <p style={{ color: 'var(--ap-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>These stories will display dynamic tails of hope directly on the public section.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {stories.map(s => (
                  <div key={s.id} style={{ padding: '12px', background: 'var(--ap-card-bg)', border: '1px solid var(--ap-border)', borderRadius: '8px' }}>
                    <h5 style={{ fontWeight: 'bold' }}>{s.title}</h5>
                    <p style={{ fontSize: '0.82rem', color: 'var(--ap-muted)' }}>{s.location || 'Unknown location'}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
