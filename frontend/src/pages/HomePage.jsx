import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicShell from '../components/PublicShell';
import { fetchJson, resolveImageUrl } from '../lib/api';
import { useJourneyHighlight, useReveal } from '../hooks/useReveal';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1548199973-03cce0fe87b9?w=800&q=80';

function fmt(n) {
  const x = Number(n) || 0;
  return x >= 1000 ? `${(x / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(x);
}

function StoryCard({ story, featured }) {
  const img = resolveImageUrl(story.image_url) || PLACEHOLDER_IMG;
  const desc = (story.description || '').slice(0, featured ? 220 : 130);
  return (
    <article className={featured ? 'pb-story pb-story-featured' : 'pb-story'}>
      <div className="pb-story-media">
        <span className="pb-story-tag">{story.category || story.tag || 'Rescue story'}</span>
        <img src={img} alt={story.title || 'Rescue story'} loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMG; }} />
      </div>
      <div className="pb-story-body">
        <h4>{story.title || 'A life saved'}</h4>
        <p>{desc}{(story.description || '').length > desc.length ? '…' : ''}</p>
        {story.location ? <span className="pb-story-meta"><i className="fas fa-location-dot" /> {story.location}</span> : null}
      </div>
    </article>
  );
}

export default function HomePage() {
  useReveal();
  useJourneyHighlight();

  const [config, setConfig] = useState({});
  const [stats, setStats] = useState({});
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  useEffect(() => {
    fetchJson('/api/site-config').then(setConfig).catch(() => {});
    fetchJson('/api/stats').then(setStats).catch(() => {});
    fetchJson('/api/stories')
      .then((s) => setStories(Array.isArray(s) ? s : []))
      .catch(() => setStories([]))
      .finally(() => setStoriesLoading(false));
  }, []);

  const contact = config.emergency_hotline || config.contact_email || 'pawbandhan@gmail.com';
  const heroImg = resolveImageUrl(config.hero_banner) || 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=900&q=85';

  return (
    <PublicShell>
      <section className="pb-hero pb-reveal">
        <div>
          <span className="pb-hero-badge">
            <i className="fas fa-shield-heart" /> {config.hero_badge || 'Verified NGOs & live tracking'}
          </span>
          <h1 className="pb-display">{config.hero_title || <>Every life deserves a <em>helping paw</em></>}</h1>
          <p className="pb-hero-lead">{config.hero_subtitle || "India's rescue network connects caring citizens with shelters, veterinarians, and field heroes."}</p>
          <div className="pb-hero-actions">
            <Link to="/auth/customer" className="pb-btn pb-btn-primary btn-lg"><i className="fas fa-location-dot" /> Report a case</Link>
            <a href="#portals" className="pb-btn pb-btn-outline">Partner with us</a>
          </div>
          <div className="pb-hero-meta">
            <span><i className="fas fa-check-circle" /> Free to report</span>
            <span><i className="fas fa-map-location-dot" /> Live GPS tracking</span>
            <span><i className="fas fa-envelope" /> <a href={`mailto:${contact}`}>{contact}</a></span>
          </div>
        </div>
        <div className="pb-hero-visual">
          <div className="pb-hero-ring" aria-hidden="true" />
          <img className="pb-hero-img" src={heroImg} alt="Rescued animal receiving care" />
          <div className="pb-float-card pb-float-1"><i className="fas fa-heart" /> {fmt(stats.totalRescues || 2400)}+ rescues</div>
          <div className="pb-float-card pb-float-2"><i className="fas fa-motorcycle" /> Field hero en route</div>
        </div>
      </section>

      <section id="impact" className="pb-section pb-reveal">
        <div className="pb-section-head">
          <span className="pb-label">Our impact</span>
          <h2 className="pb-display">Hearts we&apos;ve helped</h2>
        </div>
        <div className="pb-stats">
          <div className="pb-stat"><div className="pb-stat-icon" style={{ background: '#ffedd5', color: '#ea580c' }}><i className="fas fa-dog" /></div><h3>{fmt(stats.totalRescues) || '—'}</h3><p>Rescues completed</p></div>
          <div className="pb-stat"><div className="pb-stat-icon" style={{ background: '#d1fae5', color: '#059669' }}><i className="fas fa-house-chimney" /></div><h3>{fmt(stats.totalNGOs) || '—'}</h3><p>NGO partners</p></div>
          <div className="pb-stat"><div className="pb-stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fas fa-motorcycle" /></div><h3>{fmt(stats.totalRiders) || '—'}</h3><p>Field heroes</p></div>
          <div className="pb-stat"><div className="pb-stat-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><i className="fas fa-user-doctor" /></div><h3>{fmt(stats.totalDoctors) || '—'}</h3><p>Veterinarians</p></div>
        </div>
      </section>

      <section id="how" className="pb-section pb-reveal">
        <div className="pb-section-head">
          <span className="pb-label">How it works</span>
          <h2 className="pb-display">Three steps to save a life</h2>
        </div>
        <div className="pb-steps">
          <article className="pb-step"><div className="pb-step-num">1</div><h3>Snap &amp; report</h3><p>Photo, location, and animal details — under a minute.</p></article>
          <article className="pb-step"><div className="pb-step-num">2</div><h3>NGO accepts &amp; dispatches</h3><p>Nearest shelter accepts and alerts a verified hero.</p></article>
          <article className="pb-step"><div className="pb-step-num">3</div><h3>Track recovery live</h3><p>Follow progress through treatment until safe.</p></article>
        </div>
      </section>

      <section id="portals" className="pb-section pb-reveal">
        <div className="pb-section-head">
          <span className="pb-label">Portals</span>
          <h2 className="pb-display">Built for every role</h2>
        </div>
        <div className="pb-portals">
          <article className="pb-portal-card">
            <i className="portal-icon fas fa-user" style={{ background: '#dbeafe', color: '#2563eb' }} />
            <h3>Customer</h3>
            <p>Report cases and track rescues with live updates.</p>
            <Link to="/auth/customer" className="pb-btn pb-btn-primary">Customer portal</Link>
          </article>
          <article className="pb-portal-card">
            <i className="portal-icon fas fa-building" style={{ background: '#d1fae5', color: '#059669' }} />
            <h3>NGO partner</h3>
            <p>Accept assignments and dispatch field heroes.</p>
            <Link to="/ngo/login" className="pb-btn pb-btn-outline">NGO login</Link>
          </article>
          <article className="pb-portal-card">
            <i className="portal-icon fas fa-motorcycle" style={{ background: '#ffedd5', color: '#ea580c' }} />
            <h3>Field executive</h3>
            <p>Live dispatch, GPS, and handover from your phone.</p>
            <Link to="/rep/login" className="pb-btn pb-btn-outline">Field portal</Link>
          </article>
          <article className="pb-portal-card">
            <i className="portal-icon fas fa-stethoscope" style={{ background: '#fce7f3', color: '#db2777' }} />
            <h3>Veterinarian</h3>
            <p>Receive handovers and treatment workflows.</p>
            <Link to="/doctor/login" className="pb-btn pb-btn-outline">Vet login</Link>
          </article>
        </div>
      </section>

      <section id="stories" className="pb-section pb-stories-section pb-reveal">
        <div className="pb-stories-intro">
          <div className="pb-section-head" style={{ marginBottom: 0, textAlign: 'left' }}>
            <span className="pb-label">Success stories</span>
            <h2 className="pb-display">{config.stories_section_title || 'Tails of hope'}</h2>
            <p className="pb-stories-lead">{config.stories_section_lead || 'Real rescues published by the PawBandhan team.'}</p>
          </div>
        </div>
        {storiesLoading ? (
          <div className="pb-stories-loading"><i className="fas fa-spinner fa-spin" /> Loading stories…</div>
        ) : stories.length ? (
          <div className={`pb-stories pb-stories-has-items${stories.length > 3 ? ' pb-stories-many' : ''}`}>
            {stories.slice(0, 6).map((s, i) => <StoryCard key={s.id || i} story={s} featured={i === 0} />)}
          </div>
        ) : (
          <div className="pb-stories-empty">
            <i className="fas fa-paw" />
            <p>{config.stories_empty_message || 'Success stories will appear once published from the admin portal.'}</p>
          </div>
        )}
      </section>

      <section className="pb-cta pb-reveal">
        <div>
          <h2 className="pb-display">See an animal in distress?</h2>
          <p style={{ color: 'var(--pb-muted)', marginTop: 8 }}>Your report can start a rescue in minutes.</p>
        </div>
        <Link to="/auth/customer" className="pb-btn pb-btn-primary"><i className="fas fa-plus-circle" /> Start a rescue report</Link>
      </section>
    </PublicShell>
  );
}
