'use client';

export function calcProgress(workflowStatus) {
  const steps = defaultSteps();
  const idx = steps.findIndex(s => s.key === workflowStatus);
  if (idx < 0) return { pct: 0, currentIdx: 0, steps };
  return { pct: Math.round(((idx + 1) / steps.length) * 100), currentIdx: idx, steps };
}

export function defaultSteps() {
  return [
    { key: 'reported', label: 'Reported', icon: 'fa-solid fa-flag' },
    { key: 'ngo_assigned', label: 'NGO Assigned', icon: 'fa-solid fa-building' },
    { key: 'ngo_accepted', label: 'NGO Accepted', icon: 'fa-solid fa-check' },
    { key: 'rep_dispatched', label: 'Rescuer Dispatched', icon: 'fa-solid fa-motorcycle' },
    { key: 'rep_arrived_incident', label: 'Arrived at Scene', icon: 'fa-solid fa-location-dot' },
    { key: 'at_doctor', label: 'At Vet Clinic', icon: 'fa-solid fa-stethoscope' },
    { key: 'treatment_complete', label: 'Treatment Done', icon: 'fa-solid fa-medkit' },
    { key: 'ngo_received', label: 'NGO Received', icon: 'fa-solid fa-hand-holding-heart' },
    { key: 'resolved', label: 'Resolved', icon: 'fa-solid fa-circle-check' },
  ];
}

export function normalizeCode(code) {
  if (!code) return '';
  if (code.toUpperCase().startsWith('PB')) return code.toUpperCase();
  return 'PB-' + code.toUpperCase();
}

export function formatStepTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const STATUS_LABELS = {
  pending: 'Pending',
  open: 'Open',
  reported: 'Reported',
  ngo_assigned: 'NGO Assigned',
  ngo_accepted: 'NGO Accepted',
  ringing_rep: 'Dispatching Rescuer',
  rep_dispatched: 'Rescuer Dispatched',
  rep_accepted: 'Rescuer En Route',
  rep_arrived_incident: 'Rescuer at Scene',
  photo_incident_verified: 'Incident Verified',
  doctor_requested: 'Vet Requested',
  doctor_assigned: 'Vet Assigned',
  doctor_approved: 'Vet Approved',
  animal_picked_up: 'Animal Picked Up',
  en_route_doctor: 'En Route to Vet',
  rep_arrived_doctor: 'Arrived at Vet',
  handover_otp_pending: 'Handover Pending',
  at_doctor: 'At Vet Clinic',
  treatment_in_progress: 'Treatment in Progress',
  treatment_complete: 'Treatment Complete',
  pickup_requested: 'Pickup Requested',
  pickup_en_route: 'Pickup En Route',
  pickup_arrived: 'Pickup Arrived',
  ngo_received: 'NGO Received',
  released_safe: 'Released Safe',
  adopted_ngo: 'Adopted by NGO',
  resolved: 'Resolved',
};
