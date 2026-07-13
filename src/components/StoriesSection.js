'use client';

import { useEffect, useState } from 'react';

export default function StoriesSection() {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    fetch('/api/stories')
      .then(r => r.json())
      .then(d => setStories(Array.isArray(d) ? d.slice(0, 3) : []))
      .catch(() => {});
  }, []);

  if (!stories.length) return null;

  return (
    <section className="pb-section" style={{ background: 'rgba(255,255,255,0.4)' }}>
      <div className="pb-section-header">
        <h2>Rescue stories</h2>
        <p>Real rescues, real impact — every story matters.</p>
      </div>
      <div className="pb-card-grid">
        {stories.map((s, i) => (
          <div key={i} className="pb-card" style={{ overflow: 'hidden', padding: 0 }}>
            {s.imageUrl && (
              <div style={{ height: 180, overflow: 'hidden' }}>
                <img src={s.imageUrl} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ padding: 24 }}>
              {s.category && <span className="badge badge-green" style={{ marginBottom: 8 }}>{s.category}</span>}
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', margin: '0 0 8px' }}>{s.title}</h3>
              {s.location && <p style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)', margin: '0 0 8px' }}><i className="fas fa-location-dot" style={{ marginRight: 4 }}></i>{s.location}</p>}
              <p style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.5, margin: 0 }}>{s.description?.slice(0, 120)}{s.description?.length > 120 ? '…' : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
