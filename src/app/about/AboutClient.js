'use client';

import { useState, useEffect } from 'react';
import SiteLogo from '@/components/SiteLogo';

export default function AboutClient() {
  const [about, setAbout] = useState({});
  const [team, setTeam] = useState([]);
  const [social, setSocial] = useState({});

  useEffect(() => {
    fetch('/api/admin/cms').then(r => r.json()).then(d => {
      const aboutData = {};
      const socialData = {};
      for (const [k, v] of Object.entries(d)) {
        if (k.startsWith('about_')) aboutData[k.replace('about_', '')] = v;
        if (k.startsWith('social_')) socialData[k.replace('social_', '')] = v;
      }
      setAbout(aboutData);
      setSocial(socialData);
    }).catch(() => {});
    fetch('/api/team').then(r => r.json()).then(d => setTeam(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <SiteLogo size={64} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.2rem', margin: '20px 0 12px' }}>
          {about.title || 'About PawBandhan'}
        </h1>
        {about.mission && <p style={{ fontSize: '1.1rem', color: 'var(--color-pb-text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>{about.mission}</p>}
      </div>

      {/* Description */}
      {about.description && (
        <div className="glass" style={{ padding: 32, marginBottom: 32 }}>
          <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-pb-text-secondary)' }}>{about.description}</p>
        </div>
      )}

      {/* Vision & Values */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        {about.vision && (
          <div className="glass" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, margin: '0 0 12px', color: 'var(--color-pb-primary)' }}><i className="fas fa-eye" style={{ marginRight: 8 }}></i>Our Vision</h3>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--color-pb-text-secondary)' }}>{about.vision}</p>
          </div>
        )}
        {about.values && (
          <div className="glass" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, margin: '0 0 12px', color: 'var(--color-pb-primary)' }}><i className="fas fa-heart" style={{ marginRight: 8 }}></i>Our Values</h3>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--color-pb-text-secondary)' }}>{about.values}</p>
          </div>
        )}
      </div>

      {/* Story */}
      {about.story && (
        <div className="glass" style={{ padding: 32, marginBottom: 32 }}>
          <h3 style={{ fontWeight: 700, margin: '0 0 16px', fontSize: '1.2rem' }}><i className="fas fa-book-open" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>Our Story</h3>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--color-pb-text-secondary)' }}>{about.story}</p>
        </div>
      )}

      {/* Team */}
      {team.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', textAlign: 'center', marginBottom: 24 }}>Meet Our Team</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {team.map(m => (
              <div key={m.id} className="glass" style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px', overflow: 'hidden', background: 'var(--color-pb-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.photoUrl ? <img src={m.photoUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fas fa-user" style={{ fontSize: 40, color: 'var(--color-pb-text-muted)' }}></i>}
                </div>
                <h4 style={{ fontWeight: 700, margin: '0 0 4px' }}>{m.name}</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-pb-primary)', fontWeight: 600, marginBottom: 4 }}>{m.role}</div>
                {m.department && <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)', marginBottom: 8 }}>{m.department}</div>}
                {m.bio && <p style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.5 }}>{m.bio}</p>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                  {m.linkedin && <a href={m.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0077B5' }}><i className="fab fa-linkedin"></i></a>}
                  {m.twitter && <a href={m.twitter} target="_blank" rel="noopener noreferrer" style={{ color: '#1DA1F2' }}><i className="fab fa-twitter"></i></a>}
                  {m.instagram && <a href={m.instagram} target="_blank" rel="noopener noreferrer" style={{ color: '#E1306C' }}><i className="fab fa-instagram"></i></a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
