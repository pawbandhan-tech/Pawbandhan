import Link from 'next/link';

export default function PortalsSection() {
  const portals = [
    { icon: 'fa-solid fa-paw', title: 'Customer Portal', desc: 'Report rescues, track cases, and manage your profile.', href: '/auth/customer', color: 'var(--color-pb-primary)' },
    { icon: 'fa-solid fa-building', title: 'NGO Partner', desc: 'Manage cases, dispatch rescuers, and coordinate with vets.', href: '/auth/ngo', color: 'var(--color-pb-ngo)' },
    { icon: 'fa-solid fa-stethoscope', title: 'Veterinarian', desc: 'View assigned cases, submit treatments, and track patients.', href: '/auth/doctor', color: 'var(--color-pb-doctor)' },
    { icon: 'fa-solid fa-motorcycle', title: 'Field Rescuer', desc: 'Accept dispatches, navigate to incidents, and upload updates.', href: '/auth/representative', color: 'var(--color-pb-rep)' },
  ];

  return (
    <section id="portals" className="pb-section">
      <div className="pb-section-header">
        <h2>Choose your portal</h2>
        <p>Different roles, one connected rescue network.</p>
      </div>
      <div className="pb-card-grid">
        {portals.map((p, i) => (
          <Link key={i} href={p.href} style={{ textDecoration: 'none' }}>
            <div className="pb-card" style={{ cursor: 'pointer', height: '100%' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: `${p.color}15`, color: p.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', marginBottom: 16,
              }}>
                <i className={p.icon}></i>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', margin: '0 0 8px' }}>{p.title}</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
