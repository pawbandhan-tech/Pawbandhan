'use client';
export default function FloatingSupport() {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      <button className="btn btn-primary" style={{ borderRadius: '50%', width: 56, height: 56, boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }} onClick={() => document.getElementById('global-support-dialog')?.showModal()}>
        <i className="fas fa-headset" style={{ fontSize: 20 }}></i>
      </button>
    </div>
  );
}
