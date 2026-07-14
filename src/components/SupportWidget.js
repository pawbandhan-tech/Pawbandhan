'use client';
import { useState, useEffect } from 'react';

export default function SupportWidget({ uid, email, name, userType = 'customer', isAdmin = false, isStaff = false, agentName = '' }) {
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [creatorDetails, setCreatorDetails] = useState(null);
  const [showCreatorDetail, setShowCreatorDetail] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [chatConfig, setChatConfig] = useState({});

  const apiUrl = isAdmin || isStaff ? '/api/admin/support' : `/api/support/tickets?${uid ? `uid=${uid}` : `email=${email || ''}`}`;
  const replyUrl = '/api/support/reply';
  const createUrl = '/api/support/tickets';

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (isAdmin || isStaff) {
        setTickets(Array.isArray(data.tickets) ? data.tickets : []);
        setAgents(Array.isArray(data.agents) ? data.agents : []);
      } else {
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  }

  async function loadChatConfig() {
    try {
      const res = await fetch('/api/support/chat-config');
      const data = await res.json();
      setChatConfig(data);
    } catch (e) { /* ignore */ }
  }

  useEffect(() => { loadTickets(); loadChatConfig(); }, []);

  async function fetchCreatorDetails(ticketId) {
    const res = await fetch('/api/admin/support', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'creator-details', ticketId }),
    });
    const data = await res.json();
    setCreatorDetails(data);
    setShowCreatorDetail(true);
  }

  async function createTicket(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    data.creatorUid = uid || '';
    data.creatorEmail = email || '';
    data.creatorName = name || '';
    data.createdBy = userType;
    data.isLiveChat = data.isLiveChat === 'on';
    const res = await fetch(createUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (json.ok) { showToast('Ticket created!'); setShowForm(false); loadTickets(); }
    else showToast(json.error || 'Failed to create', 'error');
  }

  async function sendReply(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const message = form.get('message');
    if (!message) return;
    const res = await fetch(replyUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: selectedTicket.id, message, senderType: isAdmin ? 'admin' : isStaff ? 'staff' : userType, senderUid: uid || '', senderName: name || agentName || (isAdmin ? 'Admin' : isStaff ? 'Support Staff' : 'User') }),
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

  async function transferTicket(ticketId, toAgentUid, toAgentName) {
    const res = await fetch('/api/admin/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'transfer', ticketId, assignedTo: toAgentName, assignedToUid: toAgentUid }) });
    const json = await res.json();
    if (json.ok) { showToast(`Transferred to ${toAgentName}`); setShowTransfer(false); loadTickets(); }
    else showToast('Transfer failed', 'error');
  }

  const priorityColors = { low: 'badge-green', medium: 'badge-gold', high: 'badge-orange', urgent: 'badge-red' };
  const statusColors = { open: 'badge-green', in_progress: 'badge-blue', resolved: 'badge-teal', closed: 'badge-gray' };
  const categoryLabels = { general: 'General', bug: 'Bug Report', feature: 'Feature Request', payment: 'Payment', case: 'Case Help', other: 'Other' };
  
  const filteredTickets = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus);

  const chatEnabled = chatConfig.chat_enabled !== 'false';
  const chatStart = chatConfig.chat_start || '09:00';
  const chatEnd = chatConfig.chat_end || '18:00';
  const chatDays = chatConfig.chat_days || 'mon,tue,wed,thu,fri,sat';
  const isChatAvailable = () => {
    if (!chatEnabled) return false;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const dayNames = ['sun','mon','tue','wed','thu','fri','sat'];
    const today = dayNames[now.getDay()];
    if (!chatDays.split(',').includes(today)) return false;
    const hours = now.getHours();
    const mins = now.getMinutes();
    const currentMins = hours * 60 + mins;
    const [startH, startM] = chatStart.split(':').map(Number);
    const [endH, endM] = chatEnd.split(':').map(Number);
    return currentMins >= (startH*60+startM) && currentMins < (endH*60+endM);
  };

  return (
    <div>
      {toast && (<div className="toast-container"><div className={`toast toast-${toast.type}`}><i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>{toast.msg}</div></div>)}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>
          <i className="fas fa-paw" style={{ marginRight: 8, color: 'var(--color-pb-primary)' }}></i>
          {isAdmin ? 'All Support Tickets' : isStaff ? 'My Assigned Tickets' : 'My Support Tickets'}
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isChatAvailable() && !isAdmin && !isStaff && (
            <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }}></span>
              Live Chat Available ({chatStart}-{chatEnd})
            </span>
          )}
          {(isAdmin || isStaff) && (
            <select className="pb-select" style={{ fontSize: '0.82rem' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
            </select>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><i className="fas fa-plus"></i> New Ticket</button>
        </div>
      </div>

      {!isChatAvailable() && !isAdmin && !isStaff && (
        <div className="glass" style={{ padding: 12, marginBottom: 16, textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-pb-text-muted)', background: 'rgba(234,179,8,0.08)', borderLeft: '3px solid #eab308' }}>
          <i className="fas fa-clock" style={{ marginRight: 6 }}></i>
          Live chat is available {chatDays.split(',').map(d => d.charAt(0).toUpperCase()+d.slice(1)).join('-')} {chatStart}-{chatEnd} IST. You can still create a ticket anytime.
        </div>
      )}

      {showCreatorDetail && creatorDetails && (
        <div className="glass" style={{ padding: 16, marginBottom: 16, background: 'rgba(139,92,246,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>
              <i className="fas fa-user-circle" style={{ marginRight: 6, color: 'var(--color-pb-primary)' }}></i>
              Creator Account Details
            </h4>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreatorDetail(false)}><i className="fas fa-xmark"></i></button>
          </div>
          {creatorDetails.user && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.82rem', marginBottom: 12 }}>
              <div><strong>Name:</strong> {creatorDetails.user.name || '—'}</div>
              <div><strong>Role:</strong> {creatorDetails.user.role || '—'}</div>
              <div><strong>Email:</strong> {creatorDetails.user.email || '—'}</div>
              <div><strong>Status:</strong> {creatorDetails.user.status || '—'}</div>
            </div>
          )}
          {creatorDetails.doctor && <div style={{ fontSize: '0.82rem', marginBottom: 8 }}><strong>Vet Info:</strong> {creatorDetails.doctor.name} — {creatorDetails.doctor.specialization} at {creatorDetails.doctor.hospital}</div>}
          {creatorDetails.ngo && <div style={{ fontSize: '0.82rem', marginBottom: 8 }}><strong>NGO:</strong> {creatorDetails.ngo.name} — {creatorDetails.ngo.regNumber} ({creatorDetails.ngo.city})</div>}
          {creatorDetails.rep && <div style={{ fontSize: '0.82rem', marginBottom: 8 }}><strong>Rider:</strong> {creatorDetails.rep.name} — {creatorDetails.rep.vehicleType}</div>}
          {creatorDetails.cases && creatorDetails.cases.length > 0 && (
            <div>
              <strong style={{ fontSize: '0.82rem' }}>Recent Cases ({creatorDetails.cases.length}):</strong>
              <div style={{ marginTop: 6 }}>
                {creatorDetails.cases.map((c, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', padding: '4px 0', borderBottom: '1px solid var(--color-pb-border)' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.incidentCode || '—'}</span> — {c.animalType || '—'} — 
                    <span className={`badge ${c.status === 'open' ? 'badge-green' : c.status === 'resolved' ? 'badge-blue' : 'badge-gold'}`} style={{ marginLeft: 6, fontSize: '0.7rem' }}>{c.workflowStatus || c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!creatorDetails.user && !creatorDetails.doctor && !creatorDetails.ngo && !creatorDetails.rep && (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)' }}>No account details available for this creator.</p>
          )}
        </div>
      )}

      {showTransfer && (
        <div className="modal-overlay" onClick={() => setShowTransfer(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Transfer Ticket</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowTransfer(false)}><i className="fas fa-xmark"></i></button></div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--color-pb-text-muted)', marginBottom: 14 }}>Select an agent to transfer this ticket to:</p>
              {agents.filter(a => a.active).length === 0 ? (
                <p style={{ color: 'var(--color-pb-text-muted)' }}>No agents available</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {agents.filter(a => a.active).map(a => (
                    <button key={a.id} className="glass" onClick={() => transferTicket(selectedTicket?.id, a.uid, a.name)}
                      style={{ padding: 14, textAlign: 'left', border: 'none', width: '100%', cursor: 'pointer', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-pb-text-muted)' }}>{a.department || 'Support'} {a.online ? '• Online' : '• Offline'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>Load: {a.currentLoad}/{a.maxLoad}</span>
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--color-pb-border)', marginTop: 4 }}>
                          <div style={{ width: `${((a.currentLoad||0)/(a.maxLoad||10))*100}%`, height: '100%', borderRadius: 2, background: ((a.currentLoad||0) >= (a.maxLoad||10) * 0.8 ? 'var(--color-pb-danger)' : 'var(--color-pb-primary)') }}></div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTicket ? (
        <div className="glass" style={{ padding: 24 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedTicket(null); setShowCreatorDetail(false); setCreatorDetails(null); loadTickets(); }} style={{ marginBottom: 16 }}>
            <i className="fas fa-arrow-left"></i> Back to tickets
          </button>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-pb-text-secondary)' }}>
                {selectedTicket.ticketCode || '—'}
              </span>
              {selectedTicket.isLiveChat && <span className="badge badge-green" style={{ fontSize: '0.72rem' }}><i className="fas fa-circle" style={{ fontSize: 6 }}></i> Live Chat</span>}
            </div>
            <h3 style={{ fontWeight: 700, margin: '0 0 8px' }}>{selectedTicket.subject}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className={`badge ${statusColors[selectedTicket.status] || 'badge-gray'}`}>{selectedTicket.status?.replace(/_/g, ' ')}</span>
              <span className={`badge ${priorityColors[selectedTicket.priority] || 'badge-gold'}`}>{selectedTicket.priority}</span>
              <span className="badge badge-blue">{categoryLabels[selectedTicket.category] || selectedTicket.category}</span>
              {selectedTicket.assignedTo && <span className="badge badge-teal"><i className="fas fa-user-check" style={{ marginRight: 4 }}></i>{selectedTicket.assignedTo}</span>}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-pb-text-muted)' }}>
              Opened by {selectedTicket.creatorName || 'User'} on {new Date(selectedTicket.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </div>
            {(isAdmin || isStaff) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => fetchCreatorDetails(selectedTicket.id)}>
                  <i className="fas fa-user"></i> View Details
                </button>
                {isAdmin && selectedTicket.status !== 'closed' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowTransfer(true)}>
                    <i className="fas fa-arrow-right-arrow-left"></i> Transfer
                  </button>
                )}
                {selectedTicket.status !== 'in_progress' && selectedTicket.status !== 'resolved' && (
                  <button className="btn btn-blue btn-sm" onClick={() => updateStatus(selectedTicket.id, 'in_progress')}><i className="fas fa-spinner"></i> In Progress</button>
                )}
                {selectedTicket.status !== 'resolved' && (
                  <button className="btn btn-green btn-sm" onClick={() => updateStatus(selectedTicket.id, 'resolved')}><i className="fas fa-check"></i> Resolve</button>
                )}
                {selectedTicket.status !== 'closed' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(selectedTicket.id, 'closed')}><i className="fas fa-lock"></i> Close</button>
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
              <div key={r.id} className="glass" style={{ padding: 14, marginBottom: 10, background: r.senderType === 'admin' || r.senderType === 'staff' ? 'rgba(34,197,94,0.05)' : 'rgba(59,130,246,0.05)', marginLeft: r.senderType === 'admin' || r.senderType === 'staff' ? 0 : 24, marginRight: r.senderType === 'admin' || r.senderType === 'staff' ? 24 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {r.senderName || (r.senderType === 'admin' ? 'Support Team' : r.senderType === 'staff' ? 'Support Staff' : 'You')}
                    {(r.senderType === 'admin' || r.senderType === 'staff') && <span className="badge badge-green" style={{ marginLeft: 8, fontSize: '0.7rem' }}>Staff</span>}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4 }}>{t.subject}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-pb-text-muted)' }}>
                          <span style={{ fontFamily: 'monospace' }}>{t.ticketCode?.split('-').slice(0, -1).join('-')}-<strong style={{ color: 'var(--color-pb-primary)' }}>{t.ticketCode?.split('-').pop()}</strong></span> — {new Date(t.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          {t.assignedTo && <span style={{ marginLeft: 8, color: 'var(--color-pb-text-secondary)' }}><i className="fas fa-user"></i> {t.assignedTo}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {t.isLiveChat && <i className="fas fa-circle" style={{ fontSize: 8, color: '#22c55e' }}></i>}
                        <span className={`badge ${statusColors[t.status] || 'badge-gray'}`} style={{ fontSize: '0.72rem' }}>{t.status?.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-pb-text-muted)' }}>{t.replies?.length || 0} <i className="fas fa-comment"></i></span>
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
            <div className="modal-header"><h3><i className="fas fa-paw" style={{ marginRight: 6, color: 'var(--color-pb-primary)' }}></i>Create Support Ticket</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}><i className="fas fa-xmark"></i></button></div>
            <div className="modal-body">
              <form onSubmit={createTicket} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label className="pb-label">Subject</label><input className="pb-input" name="subject" required placeholder="Brief summary of your issue" /></div>
                <div><label className="pb-label">Description</label><textarea className="pb-textarea" name="description" rows={4} required placeholder="Detailed description of your issue" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label className="pb-label">Category</label>
                    <select className="pb-select" name="category">
                      <option value="general">General</option><option value="bug">Bug Report</option><option value="feature">Feature Request</option><option value="payment">Payment Issue</option><option value="case">Case Help</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div><label className="pb-label">Priority</label>
                    <select className="pb-select" name="priority" defaultValue="medium">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                {!isAdmin && !isStaff && isChatAvailable() && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="isLiveChat" style={{ width: 18, height: 18 }} />
                    <span><i className="fas fa-headset" style={{ marginRight: 4 }}></i>Start live chat (we'll respond in real-time)</span>
                  </label>
                )}
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><i className="fas fa-paper-plane"></i> Submit Ticket</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
