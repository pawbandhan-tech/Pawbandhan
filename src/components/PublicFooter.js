'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteLogo from '@/components/SiteLogo';

const defaultLinks = {
  instagram: 'https://instagram.com/pawbandhan',
  twitter: 'https://twitter.com/pawbandhan',
  facebook: 'https://facebook.com/pawbandhan',
  linkedin: 'https://linkedin.com/company/pawbandhan',
  youtube: 'https://youtube.com/@pawbandhan',
  github: 'https://github.com/pawbandhan-tech',
};

export default function PublicFooter() {
  const [social, setSocial] = useState({});

  useEffect(() => {
    fetch('/api/admin/cms').then(r => r.json()).then(d => {
      const socialData = {};
      for (const [k, v] of Object.entries(d || {})) {
        if (k.startsWith('social_') && v) socialData[k.replace('social_', '')] = v;
      }
      setSocial(socialData);
    }).catch(() => {});
  }, []);

  const links = { ...defaultLinks, ...social };

  return (
    <footer style={{
      background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(59,130,246,0.05))',
      borderTop: '1px solid var(--color-pb-border)',
      padding: '48px 24px 32px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <SiteLogo size={32} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>PawBandhan</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.6 }}>
              India&apos;s connected animal rescue network. Every rescue organized around live updates, clear handoffs, and faster response.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              {links.instagram && (
                <a href={links.instagram} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E1306C', textDecoration: 'none' }}>
                  <i className="fab fa-instagram"></i>
                </a>
              )}
              {links.twitter && (
                <a href={links.twitter} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1DA1F2', textDecoration: 'none' }}>
                  <i className="fab fa-twitter"></i>
                </a>
              )}
              {links.facebook && (
                <a href={links.facebook} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4267B2', textDecoration: 'none' }}>
                  <i className="fab fa-facebook"></i>
                </a>
              )}
              {links.linkedin && (
                <a href={links.linkedin} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0077B5', textDecoration: 'none' }}>
                  <i className="fab fa-linkedin"></i>
                </a>
              )}
              {links.youtube && (
                <a href={links.youtube} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF0000', textDecoration: 'none' }}>
                  <i className="fab fa-youtube"></i>
                </a>
              )}
              {links.github && (
                <a href={links.github} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', textDecoration: 'none' }}>
                  <i className="fab fa-github"></i>
                </a>
              )}
              {links.whatsapp && (
                <a href={`https://wa.me/${links.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366', textDecoration: 'none' }}>
                  <i className="fab fa-whatsapp"></i>
                </a>
              )}
              {links.telegram && (
                <a href={links.telegram} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0088cc', textDecoration: 'none' }}>
                  <i className="fab fa-telegram"></i>
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-pb-text-muted)', marginBottom: 16 }}>Quick Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/donate" style={{ fontSize: '0.88rem', color: 'var(--color-pb-primary)', textDecoration: 'none', fontWeight: 600 }}>
                <i className="fas fa-heart" style={{ marginRight: 6 }}></i>Donate
              </Link>
              <Link href="/auth/customer" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>Report a rescue</Link>
              <Link href="/auth/customer" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>Customer portal</Link>
              <Link href="/auth/ngo" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>NGO partner</Link>
              <Link href="/auth/doctor" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>Veterinarian</Link>
              <Link href="/auth/representative" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>Field Rescuer</Link>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-pb-text-muted)', marginBottom: 16 }}>For Organizations</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/auth/ngo" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>Register NGO</Link>
              <Link href="/auth/doctor" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>Register as Vet</Link>
              <Link href="/admin" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>Admin Panel</Link>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-pb-text-muted)', marginBottom: 16 }}>Contact</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="mailto:pawbandhan@gmail.com" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>
                <i className="fas fa-envelope" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>pawbandhan@gmail.com
              </a>
              <span style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)' }}>
                <i className="fas fa-phone" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>Emergency: Contact via email
              </span>
              <span style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)' }}>
                <i className="fas fa-globe" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>pawbandhan.onrender.com
              </span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-pb-border)', paddingTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>
              &copy; {new Date().getFullYear()} PawBandhan. All rights reserved.
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Designed and Developed by</span>
              <a href="https://capturevisualstudios.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-pb-primary)', fontWeight: 700, textDecoration: 'none' }}>
                Capture Visual Studios
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
