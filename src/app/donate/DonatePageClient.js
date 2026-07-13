'use client';

import { useState, useEffect } from 'react';

const ANIMAL_ICONS = {
  dog: 'fa-dog', cat: 'fa-cat', cow: 'fa-cow', horse: 'fa-horse', bird: 'fa-dove',
  default: 'fa-paw',
};

function getAnimalIcon(type) {
  if (!type) return ANIMAL_ICONS.default;
  const t = type.toLowerCase();
  if (t.includes('dog') || t.includes('canine')) return ANIMAL_ICONS.dog;
  if (t.includes('cat') || t.includes('feline')) return ANIMAL_ICONS.cat;
  if (t.includes('cow') || t.includes('cattle')) return ANIMAL_ICONS.cow;
  if (t.includes('horse') || t.includes('equine')) return ANIMAL_ICONS.horse;
  if (t.includes('bird') || t.includes('avian')) return ANIMAL_ICONS.bird;
  return ANIMAL_ICONS.default;
}

function formatCode(code) {
  if (!code) return '';
  const parts = code.split('-');
  const last = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join('-');
  return { prefix, highlighted: last };
}

function ConfettiAnimation() {
  const [dots, setDots] = useState([]);
  useEffect(() => {
    const colors = ['#166b52', '#d4a017', '#ef4444', '#3b82f6', '#a855f7', '#22c55e', '#f97316'];
    const newDots = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
    setDots(newDots);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
      {dots.map(d => (
        <div key={d.id} style={{
          position: 'absolute', left: `${d.x}%`, top: '-20px',
          width: d.size, height: d.size, borderRadius: d.size > 8 ? '2px' : '50%',
          background: d.color, transform: `rotate(${d.rotation}deg)`,
          animation: `confettiFall 2.5s ease-out ${d.delay}s forwards`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function DonationModal({ caseItem, onClose, onDonated }) {
  const [amount, setAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');

  const presets = [100, 250, 500, 1000];

  function handlePresetClick(val) {
    setSelectedPreset(val);
    setAmount(String(val));
  }

  async function handleSubmit() {
    if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return; }
    setError('');
    setSubmitting(true);
    try {
      const code = caseItem.incidentCode;
      const res = await fetch(`/api/donate/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), donorName: donorName || undefined, donorEmail: donorEmail || undefined, message: message || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Donation failed');
      setShowConfetti(true);
      setSuccess(true);
      setTimeout(() => { setShowConfetti(false); onDonated(data.totals); }, 3000);
    } catch (err) { setError(err.message); }
    setSubmitting(false);
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        {showConfetti && <ConfettiAnimation />}
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(27,107,82,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <i className="fas fa-heart" style={{ fontSize: 32, color: 'var(--color-pb-primary)' }}></i>
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', marginBottom: 8 }}>Thank You!</h3>
        <p style={{ color: 'var(--color-pb-text-secondary)', fontSize: '0.92rem', marginBottom: 4 }}>
          Your donation of <strong>₹{parseFloat(amount).toLocaleString()}</strong> has been received.
        </p>
        <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.82rem' }}>
          You&apos;re helping provide life-saving treatment for this animal.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(27,107,82,0.04)', border: '1px solid var(--color-pb-border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <i className={`fas ${getAnimalIcon(caseItem.animalType)}`} style={{ color: 'var(--color-pb-primary)', fontSize: '1.1rem' }}></i>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{caseItem.animalType || 'Animal'} Rescue</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', marginBottom: 4 }}>
          {(() => { const c = formatCode(caseItem.incidentCode); return <span>{c.prefix}-<span style={{ fontWeight: 800, color: 'var(--color-pb-primary)' }}>{c.highlighted}</span></span>; })()}
        </div>
        {caseItem.treatmentReport && (
          <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
            {caseItem.treatmentReport.length > 150 ? caseItem.treatmentReport.slice(0, 150) + '...' : caseItem.treatmentReport}
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-pb-accent)' }}>
          ₹{caseItem.totalRaised?.toLocaleString() || 0} raised of ₹{caseItem.finalCost?.toLocaleString() || 0}
        </div>
      </div>

      <label className="pb-label">Donation Amount (₹)</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {presets.map(val => (
          <button key={val} onClick={() => handlePresetClick(val)} style={{
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
            border: selectedPreset === val ? '2px solid var(--color-pb-primary)' : '1px solid var(--color-pb-border)',
            background: selectedPreset === val ? 'rgba(27,107,82,0.06)' : 'transparent',
            fontWeight: 700, fontSize: '0.88rem', fontFamily: 'var(--font-sans)', color: 'var(--color-pb-text)',
          }}>₹{val}</button>
        ))}
      </div>
      <input
        className="pb-input"
        type="number"
        min="1"
        placeholder="Custom amount"
        value={amount}
        onChange={e => { setAmount(e.target.value); setSelectedPreset(null); }}
        style={{ marginBottom: 16 }}
      />

      <label className="pb-label">Your Name (optional)</label>
      <input className="pb-input" placeholder="Anonymous hero" value={donorName} onChange={e => setDonorName(e.target.value)} style={{ marginBottom: 12 }} />

      <label className="pb-label">Email (optional)</label>
      <input className="pb-input" type="email" placeholder="you@email.com" value={donorEmail} onChange={e => setDonorEmail(e.target.value)} style={{ marginBottom: 12 }} />

      <label className="pb-label">Message (optional)</label>
      <input className="pb-input" placeholder="Get well soon!" value={message} onChange={e => setMessage(e.target.value)} style={{ marginBottom: 16 }} />

      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: 'var(--color-pb-danger)', fontSize: '0.82rem', marginBottom: 12 }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }}></i>{error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitting || !amount || parseFloat(amount) <= 0}>
          {submitting ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : <><i className="fas fa-heart"></i> Donate ₹{amount ? parseFloat(amount).toLocaleString() : ''}</>}
        </button>
      </div>
    </div>
  );
}

export default function DonatePageClient() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);

  async function loadCases() {
    setLoading(true);
    try {
      const res = await fetch('/api/donate/cases');
      const data = await res.json();
      if (res.ok) {
        setCases(data.cases || []);
        setStats(data.stats || null);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { loadCases(); }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px 60px' }}>
      <div style={{ textAlign: 'center', padding: '40px 20px 50px' }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, rgba(27,107,82,0.12), rgba(212,160,23,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <i className="fas fa-heart" style={{ fontSize: 28, color: 'var(--color-pb-primary)' }}></i>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', margin: '0 0 12px', lineHeight: 1.2 }}>
          Help Animals in Need
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-pb-accent)', fontWeight: 700, margin: '0 0 8px' }}>Every Contribution Matters</p>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-pb-text-secondary)', maxWidth: 600, margin: '0 auto' }}>
          Your donation directly funds veterinary treatment for rescued animals. Every rupee counts.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--color-pb-primary)' }}></i>
          <div style={{ marginTop: 12, color: 'var(--color-pb-text-muted)' }}>Loading cases...</div>
        </div>
      ) : cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(212,160,23,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <i className="fas fa-paw" style={{ fontSize: 32, color: 'var(--color-pb-accent)' }}></i>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>No cases need funding right now</h3>
          <p style={{ color: 'var(--color-pb-text-muted)', fontSize: '0.92rem' }}>Check back soon — new animals need help every day.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {cases.map(c => {
              const progress = c.finalCost > 0 ? Math.min(100, Math.round((c.totalRaised / c.finalCost) * 100)) : 0;
              const codeDisplay = formatCode(c.incidentCode);
              return (
                <div key={c.id} style={{ borderRadius: 16, border: '1px solid var(--color-pb-border)', background: 'var(--color-pb-surface)', overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {c.photoUrl ? (
                    <div style={{ height: 180, overflow: 'hidden' }}>
                      <img src={c.photoUrl} alt={c.animalType} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ height: 140, background: 'linear-gradient(135deg, rgba(27,107,82,0.06), rgba(212,160,23,0.04))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`fas ${getAnimalIcon(c.animalType)}`} style={{ fontSize: 48, color: 'var(--color-pb-primary)', opacity: 0.3 }}></i>
                    </div>
                  )}
                  <div style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className={`fas ${getAnimalIcon(c.animalType)}`} style={{ color: 'var(--color-pb-primary)', fontSize: '0.95rem' }}></i>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{c.animalType}</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>
                        {codeDisplay.prefix}-<span style={{ fontWeight: 800, color: 'var(--color-pb-primary)' }}>{codeDisplay.highlighted}</span>
                      </span>
                    </div>

                    {c.treatmentReport && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.5, margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.treatmentReport}
                      </p>
                    )}

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--color-pb-text-muted)' }}>Progress</span>
                        <span style={{ fontWeight: 700 }}>{progress}%</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--color-pb-border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, borderRadius: 4, background: progress >= 100 ? '#22c55e' : 'var(--color-pb-primary)', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>Raised</div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-pb-primary)' }}>₹{c.totalRaised?.toLocaleString() || 0}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>Remaining</div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-pb-accent)' }}>₹{c.remaining?.toLocaleString() || 0}</div>
                      </div>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSelectedCase(c)}>
                      <i className="fas fa-heart"></i> Donate Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {stats && (
            <div style={{ textAlign: 'center', padding: '40px 20px', marginTop: 30, borderRadius: 16, background: 'rgba(27,107,82,0.04)', border: '1px solid var(--color-pb-border)' }}>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-pb-text)', marginBottom: 4 }}>
                ₹{stats.totalRaised?.toLocaleString() || 0} raised across {stats.totalCases || 0} case{stats.totalCases !== 1 ? 's' : ''} by {stats.totalDonors || 0} donor{stats.totalDonors !== 1 ? 's' : ''}
              </p>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-pb-text-muted)' }}>
                Every donation makes a difference. Thank you for your generosity.
              </p>
            </div>
          )}
        </>
      )}

      {selectedCase && (
        <div className="modal-overlay" onClick={() => { setSelectedCase(null); loadCases(); }}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Make a Donation</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => { setSelectedCase(null); loadCases(); }}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <DonationModal caseItem={selectedCase} onClose={() => { setSelectedCase(null); loadCases(); }} onDonated={() => { setSelectedCase(null); loadCases(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
