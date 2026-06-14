import { apiUrl, fetchJson } from './api';

const TOKEN_KEY = 'paw_admin_token';
const ADMIN_KEY = 'paw_admin_profile';

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getProfile() {
  try {
    return JSON.parse(sessionStorage.getItem(ADMIN_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setSession(token, admin) {
  sessionStorage.setItem(TOKEN_KEY, token);
  if (admin) sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function authHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function adminFetchJson(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: authHeaders(options.headers || {})
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Invalid response from API.');
  }
  if (res.status === 401) {
    clearSession();
    throw new Error('Session expired. Sign in again.');
  }
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export async function login(email, password) {
  const data = await fetchJson('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  setSession(data.token, data.admin);
  return data;
}

export async function verifySession() {
  if (!getToken()) return false;
  try {
    const data = await adminFetchJson('/api/admin/me');
    if (data.admin) setSession(getToken(), data.admin);
    return true;
  } catch {
    clearSession();
    return false;
  }
}
