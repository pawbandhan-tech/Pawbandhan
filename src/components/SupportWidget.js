'use client';
import { useState, useEffect } from 'react';

export default function SupportWidget({ uid, email, name, userType = 'customer', isAdmin = false }) {
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const apiUrl = isAdmin ? '/api/admin/support' : `/api/support/tickets?${uid ? `uid=${uid}` : `email=${email || ''}`}`;
  const replyUrl = '/api/support/reply';
  const createUrl = '/api/support/tickets';

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { loadTickets(); }, []);

  async function createTicket(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    data.creatorUid = uid || '';
    data.creatorEmail = email || '';
    data.creatorName = name || '';
    data.createdBy = userType;
    const res = await fetch(createUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (json.ok) {
      showToast('Ticket created!');
      setShowForm(false);
      loadTickets();
    } else {
      showToast(json.error || 'Failed to create', 'error');
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const message = form.get('message');
    if (!message) return;
    const res = await fetch(replyUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: selectedTicket.id, message, senderType: isAdmin ? 'admin' : userType, senderUid: uid || '', senderName: name || (isAdmin ? 'Admin' : 'User') }),
    });
    const json = await res.json();
    if (json.ok) { showToast('Reply sent'); loadTickets(); setSelectedTicket({ ...selectedTicket, replies: [...(selectedTicket.replies || []), json.reply] }); e.target.reset(); }
    else showToast('Failed to send', 'error');
  }

  async function updateStatus(ticketId, status) {
    const res = await fetch('/api/admin/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-status', ticketId, status }) });
    const json = await res.json();
    if (json.ok) { showToast('Status updated'); loadTickets(); }
    else showToast('Failed', 'error');
  }

  const priorityColors = { low: 'badge-green', medium: 'badge-gold', high: 'badge-orange', urgent: 'badge-red' };
  const statusColors = { open: 'badge-green', in_progress: 'badge-blue', resolved: 'badge-green', closed: 'badge-gray' };
  const categoryLabels = { general: 'General', bug: 'Bug Report', feature: 'Feature Request', payment: 'Payment', case: 'Case Help', other: 'Other' };

  const filteredTickets = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus);

  return (
    <div>
      {toast && (<div className="toast-container"><div className={`toast toast-${toast.type}`}><i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>{toast.msg}</div></div>)}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>
          <i className="fas fa-headset" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>
          {isAdmin ? 'Support Tickets' : 'My Support Tickets'}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <select className="pb-select" style={{ fontSize: '0.82rem' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><i className="fas fa-plus"></i> New Ticket</button>
        </div>
      </div>

      {selectedTicket ? (
        <div className="glass" style={{ padding: 24 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedTicket(null); loadTickets(); }} style={{ marginBottom: 16 }}>
            <i className="fas fa-arrow-left"></i> Back to tickets
          </button>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontWeight: 700, margin: '0 0 8px' }}>#{selectedTicket.ticketCode}</h4>
            <h3 style={{ fontWeight: 700, margin: '0 0 8px' }}>{selectedTicket.subject}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className={`badge ${statusColors[selectedTicket.status] || 'badge-gray'}`}>{selectedTicket.status?.replace(/_/g, ' ')}</span>
              <span className={`badge ${priorityColors[selectedTicket.priority] || 'badge-gold'}`}>{selectedTicket.priority}</span>
              <span className="badge badge-blue">{categoryLabels[selectedTicket.category] || selectedTicket.category}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)' }}>
              Opened by {selectedTicket.creatorName || 'User'} ({selectedTicket.creatorEmail}) on {new Date(selectedTicket.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {selectedTicket.status !== 'in_progress' && selectedTicket.status !== 'resolved' && (
                  <button className="btn btn-primary btn-sm" onClick={() => updateStatus(selectedTicket.id, 'in_progress')}>Mark In Progress</button>
                )}
                {selectedTicket.status !== 'resolved' && (
                  <button className="btn btn-green btn-sm" onClick={() => updateStatus(selectedTicket.id, 'resolved')}>Resolve</button>
                )}
                {selectedTicket.status !== 'closed' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(selectedTicket.id, 'closed')}>Close</button>
                )}
              </div>
            )}
          </div>

          <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
            <div className="glass" style={{ padding: 14, marginBottom: 12, background: 'rgba(139,92,246,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selectedTicket.creatorName || 'User'}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)' }}>{new Date(selectedTicket.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--color-pb-text-secondary)', margin: 0 }}>{selectedTicket.description}</p>
            </div>
            {selectedTicket.replies?.map(r => (
              <div key={r.id} className="glass" style={{ padding: 14, marginBottom: 10, background: r.senderType === 'admin' ? 'rgba(34,197,94,0.05)' : 'rgba(59,130,246,0.05)', marginLeft: r.senderType === 'admin' ? 0 : 24, marginRight: r.senderType === 'admin' ? 24 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {r.senderName || (r.senderType === 'admin' ? 'Support Team' : 'You')}
                    {r.senderType === 'admin' && <span className="badge badge-green" style={{ marginLeft: 8, fontSize: '0.7rem' }}>Staff</span>}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)' }}>{new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                </div>
                <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--color-pb-text-secondary)', margin: 0 }}>{r.message}</p>
              </div>
            ))}
          </div>

          {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
            <form onSubmit={sendReply} style={{ display: 'flex', gap: 8 }}>
              <textarea className="pb-textarea" name="message" placeholder="Type your reply..." rows={2} style={{ flex: 1 }} required />
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}><i className="fas fa-paper-plane"></i> Send</button>
            </form>
          )}
        </div>
      ) : (
        <div>
          {loading ? <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin"></i></div> : (
            filteredTickets.length === 0 ? (
              <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
                <i className="fas fa-inbox" style={{ fontSize: 36, color: 'var(--color-pb-text-muted)', marginBottom: 12 }}></i>
                <p style={{ color: 'var(--color-pb-text-muted)' }}>No support tickets yet. Create one to get help!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredTickets.map(t => (
                  <button key={t.id} className="glass" onClick={() => setSelectedTicket(t)} style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: 'none', width: '100%', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4 }}>{t.subject}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>#{t.ticketCode} — {new Date(t.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className={`badge ${statusColors[t.status] || 'badge-gray'}`} style={{ fontSize: '0.72rem' }}>{t.status?.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)' }}>{t.replies?.length || 0} replies</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Create Support Ticket</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}><i className="fas fa-xmark"></i></button></div>
            <div className="modal-body">
              <form onSubmit={createTicket} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label className="pb-label">Subject</label><input className="pb-input" name="subject" required placeholder="Brief summary of your issue" /></div>
                <div><label className="pb-label">Description</label><textarea className="pb-textarea" name="description" rows={4} required placeholder="Detailed description of your issue" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="pb-label">Category</label>
                    <select className="pb-select" name="category">
                      <option value="general">General</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="payment">Payment Issue</option>
                      <option value="case">Case Help</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="pb-label">Priority</label>
                    <select className="pb-select" name="priority" defaultValue="medium">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-paper-plane"></i> Submit Ticket</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
