export default function AboutSection() {
  return (
    <section id="about" className="pb-section">
      <div className="pb-section-header">
        <h2>About PawBandhan</h2>
        <p>Built to make every animal rescue organized, transparent, and fast.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 900, margin: '0 auto' }}>
        <div className="glass" style={{ padding: 28 }}>
          <div style={{ fontSize: '1.4rem', marginBottom: 12, color: 'var(--color-pb-primary)' }}>
            <i className="fas fa-bullseye"></i>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', margin: '0 0 8px' }}>Our Mission</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.6, margin: 0 }}>
            To create India&apos;s most connected animal rescue network where every animal gets timely care through technology, community, and verified partners.
          </p>
        </div>
        <div className="glass" style={{ padding: 28 }}>
          <div style={{ fontSize: '1.4rem', marginBottom: 12, color: 'var(--color-pb-accent)' }}>
            <i className="fas fa-eye"></i>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', margin: '0 0 8px' }}>Our Vision</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.6, margin: 0 }}>
            A India where no animal suffers alone — where every citizen can report a rescue, every NGO can respond efficiently, and every animal gets the care it deserves.
          </p>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <a href="mailto:pawbandhan@gmail.com" style={{ fontSize: '0.9rem', color: 'var(--color-pb-primary)', fontWeight: 700, textDecoration: 'none' }}>
          <i className="fas fa-envelope" style={{ marginRight: 8 }}></i>Get in touch: pawbandhan@gmail.com
        </a>
      </div>
    </section>
  );
}
