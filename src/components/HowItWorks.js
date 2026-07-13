export default function HowItWorks() {
  const steps = [
    { icon: 'fa-solid fa-flag', title: 'Report', desc: 'Spot an injured animal? Report it with a photo, location, and basic details in seconds.' },
    { icon: 'fa-solid fa-building', title: 'NGO Assignment', desc: 'The nearest partner NGO receives the alert and accepts the case instantly.' },
    { icon: 'fa-solid fa-motorcycle', title: 'Field Dispatch', desc: 'A trained rescuer is dispatched to the exact location with real-time GPS tracking.' },
    { icon: 'fa-solid fa-stethoscope', title: 'Vet Care', desc: 'The animal is taken to a partnered veterinarian for diagnosis and treatment.' },
    { icon: 'fa-solid fa-house-chimney', title: 'Shelter or Release', desc: 'After recovery, the animal is placed in a shelter, adopted, or safely released.' },
  ];

  return (
    <section id="how-it-works" className="pb-section" style={{ background: 'rgba(255,255,255,0.4)' }}>
      <div className="pb-section-header">
        <h2>How PawBandhan works</h2>
        <p>A single rescue flows through clear stages — every handoff tracked, every update live.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
        {steps.map((s, i) => (
          <div key={i} className="glass" style={{ padding: 28, textAlign: 'center', position: 'relative' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--color-pb-primary), var(--color-pb-primary-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '1.2rem', margin: '0 auto 16px',
            }}>
              <i className={s.icon}></i>
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-pb-accent)', marginBottom: 8 }}>STEP {i + 1}</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', margin: '0 0 8px' }}>{s.title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
