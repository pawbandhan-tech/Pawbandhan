import Link from 'next/link';

export default function CtaBanner() {
  return (
    <section className="pb-section">
      <div className="glass-lg" style={{
        padding: '48px 40px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(27,107,82,0.06), rgba(212,160,23,0.04))',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 2rem)', margin: '0 0 12px' }}>
          See an animal in distress?
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--color-pb-text-secondary)', maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.6 }}>
          Every minute counts. Report now and connect with India&apos;s fastest rescue network.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/customer" className="btn btn-primary btn-lg">
            <i className="fas fa-paw"></i> Report rescue now
          </Link>
          <Link href="/auth/ngo" className="btn btn-secondary btn-lg">
            <i className="fas fa-building"></i> Join as NGO partner
          </Link>
        </div>
      </div>
    </section>
  );
}
