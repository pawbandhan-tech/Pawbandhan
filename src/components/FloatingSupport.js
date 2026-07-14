'use client';
import { useState, useEffect, useRef } from 'react';
import SupportWidget from '@/components/SupportWidget';

export default function FloatingSupport() {
  const dialogRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
        <button
          className="btn btn-primary"
          style={{
            borderRadius: '50%', width: 60, height: 60,
            boxShadow: '0 4px 24px rgba(139,92,246,0.5)',
            background: 'linear-gradient(135deg, var(--color-pb-primary), var(--color-pb-accent))',
            border: '2px solid rgba(255,255,255,0.4)',
            animation: 'trackingDot 2s infinite',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => { setIsOpen(true); }}
          title="Need help? Chat with us!"
        >
          <i className="fas fa-paw" style={{ fontSize: 26, color: '#fff' }}></i>
        </button>
      </div>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 700, width: '90vw', maxHeight: '80vh', overflow: 'auto' }}
          >
            <div style={{ padding: 24 }}>
              <button
                className="btn btn-ghost btn-icon"
                style={{ float: 'right', fontSize: 18 }}
                onClick={() => setIsOpen(false)}
              >
                <i className="fas fa-xmark"></i>
              </button>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 20 }}>
                <i className="fas fa-paw" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>
                Need Help?
              </h3>
              <SupportWidget userType="visitor" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
