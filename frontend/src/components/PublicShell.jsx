import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function PublicShell({ children, className = 'pb-public' }) {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={className}>
      <div className="pb-paw-bg" aria-hidden="true" />
      <span className="pb-deco pb-deco-1" aria-hidden="true">🐕</span>
      <span className="pb-deco pb-deco-2" aria-hidden="true">🐈</span>
      <span className="pb-deco pb-deco-3" aria-hidden="true">🐾</span>

      <header className={`pb-site-header${scrolled ? ' scrolled' : ''}`} id="pbNav">
        <div className="pb-header-inner">
          <Link to="/" className="pb-brand">
            <span className="pb-brand-icon"><i className="fas fa-paw" /></span>
            <span className="pb-brand-text">
              <strong>PawBandhan</strong>
              <small>Rescue network</small>
            </span>
          </Link>
          <button
            type="button"
            className="pb-nav-toggle"
            aria-label="Menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
          <nav className={`pb-nav-links${navOpen ? ' open' : ''}`} id="pbNavLinks">
            <a href="#impact" onClick={() => setNavOpen(false)}><i className="fas fa-chart-line" /> Impact</a>
            <a href="#how" onClick={() => setNavOpen(false)}><i className="fas fa-route" /> How it works</a>
            <a href="#portals" onClick={() => setNavOpen(false)}><i className="fas fa-grid-2" /> Portals</a>
            <a href="#stories" onClick={() => setNavOpen(false)}><i className="fas fa-heart" /> Stories</a>
            <div className="pb-nav-cta">
              <Link to="/auth/customer" className="pb-btn pb-btn-ghost" onClick={() => setNavOpen(false)}>Sign in</Link>
              <Link to="/auth/customer" className="pb-btn pb-btn-primary" onClick={() => setNavOpen(false)}>
                <i className="fas fa-location-dot" /> Report rescue
              </Link>
            </div>
          </nav>
        </div>
        <div className="pb-header-glow" aria-hidden="true" />
      </header>

      {children}

      <footer className="pb-site-footer">
        <div className="pb-footer-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
            <path fill="currentColor" d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" />
          </svg>
        </div>
        <div className="pb-footer-inner">
          <div className="pb-footer-top">
            <div className="pb-footer-brand">
              <Link to="/" className="pb-brand pb-brand-footer">
                <span className="pb-brand-icon"><i className="fas fa-paw" /></span>
                <span className="pb-brand-text"><strong>PawBandhan</strong><small>Every paw matters</small></span>
              </Link>
              <p>India&apos;s connected rescue network — report, track, and save street animals.</p>
              <div className="pb-footer-social">
                <a href="mailto:pawbandhan@gmail.com" aria-label="Email"><i className="fas fa-envelope" /></a>
                <Link to="/auth/customer" aria-label="Report"><i className="fas fa-bell" /></Link>
              </div>
            </div>
            <div className="pb-footer-col">
              <h4>Get help</h4>
              <ul>
                <li><Link to="/auth/customer">Report an emergency</Link></li>
                <li><Link to="/dashboard">Customer portal</Link></li>
                <li><a href="mailto:pawbandhan@gmail.com">pawbandhan@gmail.com</a></li>
              </ul>
            </div>
            <div className="pb-footer-col">
              <h4>Partners</h4>
              <ul>
                <li><Link to="/ngo/login">NGO login</Link></li>
                <li><Link to="/rep/login">Field executive</Link></li>
                <li><Link to="/doctor/login">Veterinarian</Link></li>
              </ul>
            </div>
            <div className="pb-footer-col">
              <h4>Explore</h4>
              <ul>
                <li><a href="#how">How it works</a></li>
                <li><a href="#impact">Our impact</a></li>
                <li><a href="#stories">Success stories</a></li>
              </ul>
            </div>
          </div>
          <div className="pb-footer-bottom">
            <span>&copy; {new Date().getFullYear()} PawBandhan · Mumbai, India</span>
            <span className="pb-footer-tag"><i className="fas fa-paw" /> Made with care for every paw</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
