'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteLogo from '@/components/SiteLogo';

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`pb-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="pb-nav-inner">
        <Link href="/" className="pb-nav-brand">
          <SiteLogo size={36} />
          <span className="pb-nav-brand-text">PawBandhan</span>
        </Link>
        <div className="pb-nav-links">
          <Link href="/" className="pb-nav-link">Home</Link>
          <Link href="/#how-it-works" className="pb-nav-link">How it works</Link>
          <Link href="/#portals" className="pb-nav-link">Portals</Link>
          <Link href="/#about" className="pb-nav-link">About</Link>
          <Link href="/auth/customer" className="btn btn-primary btn-sm">
            <i className="fas fa-paw"></i> Report rescue
          </Link>
        </div>
        <button
          className="btn btn-ghost btn-icon pb-nav-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <i className={`fas ${mobileOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </div>
      {mobileOpen && (
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-pb-border)' }}>
          <Link href="/" className="pb-nav-link" style={{ display: 'block', padding: '12px 0' }}>Home</Link>
          <Link href="/#how-it-works" className="pb-nav-link" style={{ display: 'block', padding: '12px 0' }}>How it works</Link>
          <Link href="/#portals" className="pb-nav-link" style={{ display: 'block', padding: '12px 0' }}>Portals</Link>
          <Link href="/#about" className="pb-nav-link" style={{ display: 'block', padding: '12px 0' }}>About</Link>
          <Link href="/auth/customer" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
            <i className="fas fa-paw"></i> Report rescue
          </Link>
        </div>
      )}
    </nav>
  );
}
