'use client';

import { useEffect, useState } from 'react';

export default function ReviewsSection() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.json())
      .then(d => setReviews(Array.isArray(d) ? d.slice(0, 6) : []))
      .catch(() => {});
  }, []);

  if (!reviews.length) return null;

  return (
    <section className="pb-section">
      <div className="pb-section-header">
        <h2>What people say</h2>
        <p>Trusted by communities, NGOs, and veterinarians across India.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {reviews.map((r, i) => (
          <div key={i} className="glass" style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 2, color: 'var(--color-pb-accent)', marginBottom: 12 }}>
              {Array.from({ length: r.rating || 5 }).map((_, j) => (
                <i key={j} className="fas fa-star" style={{ fontSize: '0.75rem' }}></i>
              ))}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-pb-text)', lineHeight: 1.6, fontStyle: 'italic', margin: '0 0 16px' }}>
              &ldquo;{r.quote}&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--color-pb-primary), var(--color-pb-accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '0.8rem',
              }}>
                {r.name?.charAt(0) || '?'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>{r.role}{r.location ? ` · ${r.location}` : ''}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
