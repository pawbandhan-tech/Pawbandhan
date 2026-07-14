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
          style={{ borderRadius: '50%', width: 56, height: 56, boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}
          onClick={() => { setIsOpen(true); }}
        >
          <i className="fas fa-headset" style={{ fontSize: 20 }}></i>
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
                <i className="fas fa-headset" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>
                PawBandhan Support
              </h3>
              <SupportWidget userType="visitor" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
