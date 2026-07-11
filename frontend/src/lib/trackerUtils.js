export function normalizeCode(raw) {
  let c = String(raw || '').trim().replace(/\s+/g, '');
  if (!c) return '';
  if (!/^PB/i.test(c)) c = 'PB' + c;
  return c.toUpperCase();
}

export function calcProgress(steps) {
  if (!steps?.length) return 0;
  const activeIdx = steps.findIndex((s) => s.active);
  const idx = activeIdx >= 0 ? activeIdx : steps.filter((s) => s.done).length;
  return steps.length > 1 ? Math.round((idx / (steps.length - 1)) * 100) : 0;
}

export function defaultSteps(ws) {
  const labels = [
    { key: 'reported', label: 'Rescue requested', sub: 'Alert registered' },
    { key: 'ngo_assigned', label: 'NGO confirmed', sub: 'Partner assigned' },
    { key: 'rep_assigned', label: 'Hero assigned', sub: 'Field rep matched' },
    { key: 'rep_accepted', label: 'On the way', sub: 'Heading to animal' },
    { key: 'rep_arrived_incident', label: 'Arrived', sub: 'At location' },
    { key: 'doctor_approved', label: 'Vet ready', sub: 'Medical support' },
    { key: 'treatment_complete', label: 'Treatment done', sub: 'Vet report' },
    { key: 'resolved', label: 'Rescue complete', sub: 'Animal safe' }
  ];
  let idx = labels.findIndex((l) => l.key === ws);
  if (idx < 0) idx = 0;
  return labels.map((l, i) => ({
    ...l,
    done: i < idx,
    active: i === idx,
    pending: i > idx,
    at: null
  }));
}

export function formatStepTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    day: days[d.getDay()],
    date: `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`,
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
}

export function progressPct(c) {
  if (c.progress_percent != null) return c.progress_percent;
  const ws = c.workflow_status || 'reported';
  const order = ['reported', 'ngo_assigned', 'assigned_rep', 'ringing_rep', 'rep_accepted', 'rep_arrived_incident', 'doctor_approved', 'treatment_complete', 'resolved'];
  let idx = order.indexOf(ws);
  if (idx < 0) idx = ws === 'resolved' ? order.length - 1 : 1;
  return Math.round((idx / (order.length - 1)) * 100);
}
