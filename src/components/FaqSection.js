'use client';

import { useState } from 'react';

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState(null);

  const faqs = [
    { q: 'How do I report an injured animal?', a: 'Click "Report emergency" on the homepage or dashboard. You can use your camera to detect the animal type with AI, add a photo, location, and description. The report is sent to the nearest partner NGO instantly.' },
    { q: 'How long does a rescue take?', a: 'Typically 15–60 minutes from report to field dispatch, depending on NGO availability and location. Treatment and shelter placement may take longer based on the animal\'s condition.' },
    { q: 'Can I track the rescue in real time?', a: 'Yes. After reporting, you get a case code (e.g., PB-XXXX). You can track the full rescue journey — from NGO assignment to vet care to shelter placement — in the customer dashboard.' },
    { q: 'Is PawBandhan free to use?', a: 'Yes. PawBandhan is a platform that connects citizens with verified NGOs and veterinarians. Reporting and tracking are completely free.' },
    { q: 'How are NGOs and vets verified?', a: 'Every NGO and veterinarian goes through a KYC verification process including document checks, registration validation, and admin approval before they can receive cases.' },
    { q: 'How can my NGO join PawBandhan?', a: 'Click "Partner with us" and select NGO. Complete the registration form with your organization details and documents. Our team will review and verify your application within 48 hours.' },
  ];

  return (
    <section id="faq" className="pb-section" style={{ background: 'rgba(255,255,255,0.4)' }}>
      <div className="pb-section-header">
        <h2>Frequently asked questions</h2>
        <p>Everything you need to know about PawBandhan.</p>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {faqs.map((f, i) => (
          <div key={i} className="glass" style={{ marginBottom: 12, overflow: 'hidden' }}>
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{
                width: '100%', padding: '18px 24px', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.95rem',
                color: 'var(--color-pb-text)',
              }}
            >
              {f.q}
              <i className={`fas ${openIdx === i ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '0.8rem', color: 'var(--color-pb-text-muted)' }}></i>
            </button>
            {openIdx === i && (
              <div style={{ padding: '0 24px 18px', fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)', lineHeight: 1.6 }}>
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
