const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:');

export function apiBase() {
  if (typeof window !== 'undefined' && window.PAW_API_BASE) {
    return String(window.PAW_API_BASE).replace(/\/$/, '');
  }
  if (isLocal) return 'http://localhost:5000';
  return '';
}

export function apiUrl(path) {
  if (!path) return apiBase() || '/';
  if (path.startsWith('http')) return path;
  return apiBase() + path;
}

export function resolveImageUrl(url) {
  if (!url || !String(url).trim()) return '';
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  const base = apiBase();
  if (u.startsWith('/')) return base + u;
  return `${base}/${u.replace(/^\//, '')}`;
}

export async function fetchJson(path, options = {}) {
  const timeoutMs = options.timeoutMs != null ? options.timeoutMs : 25000;
  const { timeoutMs: _t, ...fetchOpts } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  fetchOpts.signal = controller.signal;

  let res;
  try {
    res = await fetch(apiUrl(path), fetchOpts);
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('Request timed out. Try again in a moment.');
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const t = text.trim();
      let hint = `Server returned non-JSON (${res.status}).`;
      if (t.startsWith('<!DOCTYPE') || t.startsWith('<html')) {
        hint = 'Got an HTML page instead of JSON. Check API deployment.';
      } else if (t) hint = ` ${t.slice(0, 120)}`;
      throw new Error(hint);
    }
  }
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}

export function postJson(path, body, opts = {}) {
  return fetchJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    timeoutMs: opts.timeoutMs
  });
}

export function patchJson(path, body, opts = {}) {
  return fetchJson(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    timeoutMs: opts.timeoutMs
  });
}

export function putJson(path, body, opts = {}) {
  return fetchJson(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    timeoutMs: opts.timeoutMs
  });
}
