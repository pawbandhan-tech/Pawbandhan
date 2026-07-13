import Link from 'next/link';
import SiteLogo from '@/components/SiteLogo';

export default function PublicFooter() {
  return (
    <footer style={{
      background: 'rgba(255,255,255,0.6)',
      borderTop: '1px solid var(--color-pb-border)',
      padding: '48px 24px 32px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <SiteLogo size={32} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>PawBandhan</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.6 }}>
              India&apos;s connected animal rescue network. Every rescue organized around live updates, clear handoffs, and faster response.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-pb-text-muted)', marginBottom: 16 }}>Quick Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/auth/customer" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>Report a rescue</Link>
              <Link href="/auth/customer" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>Customer portal</Link>
              <Link href="/auth/ngo" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>NGO partner</Link>
              <Link href="/auth/doctor" style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', textDecoration: 'none' }}>Veterinarian</Link>
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
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--color-pb-border)', paddingTop: 24, textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>
          &copy; {new Date().getFullYear()} PawBandhan. All rights reserved. Built with love for every paw.
        </div>
      </div>
    </footer>
  );
}
