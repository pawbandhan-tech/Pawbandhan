export const CASE_WORKFLOW_STAGES = [
  { key: 'reported', label: 'Rescue Reported', icon: 'fa-flag', color: '#22c55e', description: 'Animal rescue reported by citizen' },
  { key: 'ngo_assigned', label: 'NGO Assigned', icon: 'fa-building', color: '#3b82f6', description: 'Nearest NGO has been notified' },
  { key: 'ngo_accepted', label: 'NGO Accepted', icon: 'fa-handshake', color: '#3b82f6', description: 'NGO has accepted the case' },
  { key: 'rider_dispatched', label: 'Rider Dispatched', icon: 'fa-motorcycle', color: '#f97316', description: 'Field rescuer is on the way' },
  { key: 'rider_picking', label: 'En Route to Animal', icon: 'fa-location-dot', color: '#f97316', description: 'Rider is heading to the location', animate: true },
  { key: 'animal_picked', label: 'Animal Picked Up', icon: 'fa-paw', color: '#a855f7', description: 'Animal has been safely picked up', requiresPin: true },
  { key: 'en_route_vet', label: 'En Route to Vet', icon: 'fa-hospital', color: '#f97316', description: 'Heading to veterinary facility', animate: true },
  { key: 'at_vet', label: 'At Veterinary Clinic', icon: 'fa-stethoscope', color: '#06b6d4', description: 'Animal has reached the vet', requiresPin: true },
  { key: 'pre_treatment', label: 'Pre-Treatment Check', icon: 'fa-clipboard-check', color: '#06b6d4', description: 'Doctor is examining the animal' },
  { key: 'in_treatment', label: 'Under Treatment', icon: 'fa-heart-pulse', color: '#ef4444', description: 'Treatment is in progress' },
  { key: 'post_treatment', label: 'Treatment Complete', icon: 'fa-circle-check', color: '#22c55e', description: 'Treatment has been completed' },
  { key: 'payment_pending', label: 'Awaiting Payment', icon: 'fa-indian-rupee-sign', color: '#eab308', description: 'Payment is being processed', requiresPayment: true },
  { key: 'ready_for_drop', label: 'Ready for Drop-off', icon: 'fa-box', color: '#3b82f6', description: 'Animal is ready to be dropped' },
  { key: 'rider_dropping', label: 'En Route to Drop', icon: 'fa-motorcycle', color: '#f97316', description: 'Rider is taking animal to safe location', animate: true },
  { key: 'delivered', label: 'Delivered Safe', icon: 'fa-house-circle-check', color: '#22c55e', description: 'Animal has been safely delivered', requiresPin: true },
  { key: 'closed', label: 'Case Closed', icon: 'fa-lock', color: '#6b7280', description: 'Case has been resolved and closed' },
];

export function getWorkflowStage(key) {
  return CASE_WORKFLOW_STAGES.find(s => s.key === key) || CASE_WORKFLOW_STAGES[0];
}

export function getNextStage(currentKey) {
  const idx = CASE_WORKFLOW_STAGES.findIndex(s => s.key === currentKey);
  return idx >= 0 && idx < CASE_WORKFLOW_STAGES.length - 1 ? CASE_WORKFLOW_STAGES[idx + 1] : null;
}

export function getProgressPercent(currentKey) {
  const idx = CASE_WORKFLOW_STAGES.findIndex(s => s.key === currentKey);
  return idx >= 0 ? Math.round(((idx + 1) / CASE_WORKFLOW_STAGES.length) * 100) : 0;
}

export function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function estimateEtaMinutes(distanceKm, speedKmh = 30) {
  return Math.round((distanceKm / speedKmh) * 60);
}
