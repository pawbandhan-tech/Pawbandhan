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

/** @deprecated Only for internal checks — never save this to the database */
export function nameFromEmail(email) {
  if (!email || !String(email).includes('@')) return '';
  let local = String(email).split('@')[0];
  local = local.replace(/\d+/g, ' ').replace(/[._-]+/g, ' ').trim();
  if (!local) return '';
  return local
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function isEmailDerivedName(name, email) {
  const n = (name || '').trim();
  if (!n || !email) return !n;
  const derived = nameFromEmail(email);
  if (derived && n.toLowerCase() === derived.toLowerCase()) return true;
  const local = String(email).split('@')[0].replace(/\d+/g, '').toLowerCase();
  return local && n.toLowerCase().replace(/\s/g, '') === local;
}

export function displayName(name, email) {
  const n = (name || '').trim();
  if (n && !isEmailDerivedName(n, email)) return n;
  return '';
}

export function displayNameOrFriend(name, email) {
  return displayName(name, email) || 'Friend';
}

export function initials(name, email) {
  const d = displayName(name, email);
  if (!d) return '?';
  return d.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export function isProfileIncomplete(name, email) {
  return !displayName(name, email);
}

export { KEYS };
