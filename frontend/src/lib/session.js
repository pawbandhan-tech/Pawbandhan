const KEYS = {
  customerUid: 'customer_uid',
  portalUid: 'portal_customer_uid',
  customerName: 'portal_customer_name',
  phone: 'user_phone',
  email: 'user_email',
  gender: 'user_gender',
  demo: 'demo_session'
};

export function getCustomerUid() {
  return (
    sessionStorage.getItem(KEYS.customerUid) ||
    sessionStorage.getItem(KEYS.portalUid) ||
    null
  );
}

export function setCustomerUid(uid) {
  if (uid) sessionStorage.setItem(KEYS.customerUid, uid);
}

export function clearCustomerSession() {
  Object.values(KEYS).forEach((k) => sessionStorage.removeItem(k));
}

export function applyProfile(p) {
  if (!p) return;
  if (p.name) sessionStorage.setItem(KEYS.customerName, p.name);
  if (p.phone) sessionStorage.setItem(KEYS.phone, p.phone);
  if (p.email) sessionStorage.setItem(KEYS.email, p.email);
  if (p.gender) sessionStorage.setItem(KEYS.gender, p.gender);
}

export function getProfileFromSession() {
  return {
    name: sessionStorage.getItem(KEYS.customerName) || '',
    phone: sessionStorage.getItem(KEYS.phone) || '',
    email: sessionStorage.getItem(KEYS.email) || '',
    gender: sessionStorage.getItem(KEYS.gender) || ''
  };
}

export function displayName(name) {
  return (name || '').trim() || 'Friend';
}

export function initials(name) {
  const d = displayName(name);
  return d.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '—';
}

export { KEYS };
