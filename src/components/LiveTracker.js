'use client';
import { useState, useEffect } from 'react';

export default function LiveTracker({ caseCode, isRider = false }) {
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!caseCode) return;
    const fetchTracking = async () => {
      try {
        const res = await fetch(`/api/cases/${caseCode}/track`);
        const data = await res.json();
        setTracking(data);
        setError(null);
      } catch (e) { setError('Unable to load tracking'); }
    };
    fetchTracking();
    const interval = setInterval(fetchTracking, 10000);
    return () => clearInterval(interval);
  }, [caseCode]);

  if (error) return <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-pb-text-muted)', fontSize: '0.85rem', borderRadius: 14, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)' }}>{error}</div>;
  if (!tracking || !tracking.riderLocation) return null;

  const { riderLocation, riderName, riderPhone, vehicleInfo, status, eta } = tracking;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${riderLocation.lng - 0.01},${riderLocation.lat - 0.01},${riderLocation.lng + 0.01},${riderLocation.lat + 0.01}&layer=mapnik&marker=${riderLocation.lat},${riderLocation.lng}`;

  return (
    <div style={{ padding: 16, marginBottom: 16, borderRadius: 18, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div className="tracking-animate" style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }}></div>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Live Tracking</span>
        {eta && <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--color-pb-text-muted)' }}>ETA: {eta} min</span>}
      </div>
      <div style={{ borderRadius: 12, overflow: 'hidden', height: 200, marginBottom: 12 }}>
        <iframe src={mapUrl} style={{ width: '100%', height: '100%', border: 0 }} loading="lazy" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{riderName || 'Rider'}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}>
            {vehicleInfo ? `${vehicleInfo.type || ''} ${vehicleInfo.number || ''}`.trim() : ''}
          </div>
        </div>
        {riderPhone && (
          <a href={`tel:${riderPhone}`} style={{ padding: '8px 16px', borderRadius: 8, background: '#22c55e', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-phone" style={{ fontSize: '0.75rem' }}></i>Call
          </a>
        )}
      </div>
    </div>
  );
}
