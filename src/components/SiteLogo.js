'use client';
import { useState, useEffect } from 'react';
export default function SiteLogo({ size = 36, style = {} }) {
  const [logoUrl, setLogoUrl] = useState(null);
  useEffect(() => {
    fetch('/api/site-config').then(r => r.json()).then(d => setLogoUrl(d?.logo_url)).catch(() => {});
  }, []);
  if (logoUrl) {
    return <img src={logoUrl} alt="PawBandhan" style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', ...style }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-pb-primary), var(--color-pb-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.45, ...style }}>
      <i className="fas fa-paw"></i>
    </div>
  );
}
